import { InitialInfo, ClientInfo } from './types';
import { KosyToAppMessage, AppToKosyMessage, ReceiveMessageAsClient, ReceiveMessageAsHost } from './messages/index';
type Option<T> = T | null;

/**
 * The interface used to start up a kosy app
 * You will need to provide the interface with the type of app state, type of host message and type of client message your app uses.
 * A Host message is a message that is sent to the Host to update the state
 * A Client message is a message that is sent by the Host to all Clients to update the state
 * 
 * If no distinction needs to be made, you can make the type of HostMessage equal to the type of ClientMessage
 */
export interface IKosyApp<AppState, ClientToHostMessage, HostToClientMessage> {
    /**
     * When a new client joins, Kosy does not know the state of the app. This method will be called by Kosy to fetch the app state.
     * @returns Your app's state
     */
    onRequestState(): AppState;

    /**
     * When it is determined that your state is out of date locally, a new state will be fetched for you & set directly
     * @param state The full new state
     */
    onProvideState(state: AppState): void;

    /**
     * Will be called when a new Kosy client joins
     * @param clientInfo The information of the new client
     */
    onClientHasJoined?(clientInfo: ClientInfo): void;

    /**
     * Will be called whenever a Kosy client leaves
     * @param clientUuid The uuid of the leaving client
     */
    onClientHasLeft?(clientUuid: string): void;

    /**
     * Will be called whenever the Kosy host changes (can potentially be used to set the app's Host when the initializer leaves)
     * @param clientUuid The uuid of the new kosy host
     */
    onHostHasChanged?(clientUuid: string): void;

    /**
     * Receive a message that was sent from a client to the host, optionally, reply with a message that must be sent to all clients at the table to update the state
     * @param message The message that was sent through the Kosy network to the current app
     */
    onReceiveMessageAsHost(message: ClientToHostMessage): Option<HostToClientMessage>;

    /**
     * Receive a message that was sent from the host to the client
     * @param message The message that was received from a host to a client
     */
    onReceiveMessageAsClient(message: HostToClientMessage): void;
}

/**
 * An app proxy you can use to notify Kosy that your app has started (start) 
 * and to relay messages to all other clients in the Kosy room (relayMessage)
 * 
 * All messages that come in via Kosy are delegated to functions you need to provide in the constructor.
 */

interface PrivateClientHasJoined {
    type: "_client-has-joined";
    clientInfo: ClientInfo;
}

interface PrivateClientHasLeft {
    type: "_client-has-left";
    clientUuid: string;
}

interface PrivateHostHasChanged {
    type: "_host-has-changed";
    clientUuid: string;
}

type PrivateHostToClientMessage =
    | PrivateClientHasJoined
    | PrivateClientHasLeft
    | PrivateHostHasChanged

export class KosyApi<AppState, ClientToHostMessage, HostToClientMessage extends { type: string }> {
    private kosyApp: IKosyApp<AppState, ClientToHostMessage, HostToClientMessage>;
    private kosyClient: Window = window.parent;
    private clients: { [clientUuid: string]: ClientInfo };
    private hostClientUuid: string;
    private initialInfoPromise: Promise<InitialInfo<AppState>>;
    private latestMessageNumber = 0;

    constructor(kosyApp: IKosyApp<AppState, ClientToHostMessage, HostToClientMessage>) {
        this.kosyApp = kosyApp;
    }

    private dictionaryToArray<T> (dictionary: { [key: string]: T }): Array<[string, T]> {
        let array: Array<[string, T]> = [];
        for (const key in dictionary) {
            if (!dictionary.hasOwnProperty(key)) continue;
            array.push([key, dictionary[key]]);
        }
        return array;
    }

    public startApp(): Promise<InitialInfo<AppState>> {
        this.initialInfoPromise = new Promise((resolve, reject) => {
            window.addEventListener("message", (event: MessageEvent<KosyToAppMessage<AppState, ClientToHostMessage, HostToClientMessage>>) => {
                let eventData = event.data;
                switch (eventData.type) {
                    case "receive-initial-info":
                        this.latestMessageNumber = eventData.latestMessageNumber;
                        this.clients = eventData.payload.clients;
                        this.hostClientUuid = eventData.payload.initializerClientUuid;
                        this.log("Resolving initial info promise with: ", eventData.payload);
                        resolve (eventData.payload);
                        break;
                    case "set-client-info": {
                        let newClientInfo = eventData.clients;
                        let newHostClientUuid = eventData.hostClientUuid;

                        this.initialInfoPromise.then((initData) => {
                            let addedClients = this.dictionaryToArray(newClientInfo).filter(each => !this.clients[each[0]]);
                            let removedClients = this.dictionaryToArray(this.clients).filter(each => !newClientInfo[each[0]]);
                            
                            if (newHostClientUuid !== this.hostClientUuid && typeof this.kosyApp.onHostHasChanged === "function") {
                                this.log("On host has changed was defined -> notifying everyone the host has changed", eventData);
                                this._relayMessageToClients(initData, { type: "_host-has-changed", clientUuid: newHostClientUuid });
                            }
                            if (addedClients.length > 0 && typeof this.kosyApp.onClientHasJoined === "function") {
                                this.log("On client has joined was defined", eventData);
                                addedClients.forEach(added => this._relayMessageToClients(initData, { type: "_client-has-joined", clientInfo: added[1] }));
                            }
                            if (removedClients.length > 0 && typeof this.kosyApp.onClientHasLeft === "function") {
                                this.log("On client has left was defined", eventData);
                                removedClients.forEach(removed => this._relayMessageToClients(initData, { type: "_client-has-left", clientUuid: removed[0] }));
                            }

                            this.clients = newClientInfo;
                            this.hostClientUuid = newHostClientUuid;
                        });
                        break;
                    }
                    case "get-app-state": {
                        let clientUuids = eventData.clientUuids;
                        this.log("Get app state received -> sending app state");
                        const state = this.kosyApp.onRequestState();
                        this._sendMessageToKosy({
                            type: "receive-app-state",
                            state: state,
                            clientUuids: clientUuids,
                            latestMessageNumber: this.latestMessageNumber 
                        });
                        break;
                    }
                    case "set-app-state":
                        this.latestMessageNumber = eventData.latestMessageNumber;
                        let state = eventData.state;
                        this.initialInfoPromise.then(() => {
                            this.log("Received app state from Kosy -> setting app state");
                            this.kosyApp.onProvideState(state);
                        });
                        break;
                    case "receive-message-as-host":
                        this._handleReceiveMessageAsHost(eventData);
                        break;
                    case "receive-message-as-client":
                        this._handleReceiveMessageAsClient(eventData);
                        break;
                    default:
                        break;
                }
            });
            this._sendMessageToKosy({ type: "ready-and-listening" });
        });
        return this.initialInfoPromise;
    }

    /**
     * This kills the app -> no further processing will be available
     */
    public stopApp() {
        this._sendMessageToKosy({ type: "stop-app" });
    }

    /**
     * Relays a message to the Kosy Host. The Kosy Host will determine what to do with it (process or not?).
     * @param message the message to relay to the Kosy Host
     */
    public relayMessage(message: ClientToHostMessage) {
        this.log("Relaying client message to host: ", message);
        this._sendMessageToKosy({ type: "relay-message-to-host", message: message });
    }

    private _relayMessageToClients(initialData: InitialInfo<AppState>, message: HostToClientMessage | PrivateHostToClientMessage) {
        this.log("Relaying host to client message: ", message);
        this._sendMessageToKosy({ 
            type: "relay-message-to-clients",
            sentByClientUuid: initialData.currentClientUuid, 
            message: <any>message,
            messageNumber: ++this.latestMessageNumber 
        })
    }

    private _sendMessageToKosy (message: AppToKosyMessage<AppState, ClientToHostMessage, HostToClientMessage>) {
        this.kosyClient.postMessage(message, "*");
    }

    //Try handling the message recursively every 0.1 second for a couple of seconds
    private _handleReceiveMessageAsClientRecursive(eventData: ReceiveMessageAsClient<HostToClientMessage | PrivateHostToClientMessage>, initData: InitialInfo<AppState>, attemptNumber: number) {        
        //If you can handle the message, handle it \o/
        if (this.latestMessageNumber === eventData.messageNumber - (initData.currentClientUuid === eventData.sentByClientUuid ? 0 : 1)) {
            switch (eventData.message.type) {
                case "_host-has-changed": {                    
                    this.kosyApp.onHostHasChanged?.((<PrivateHostHasChanged>eventData.message).clientUuid);
                    break;
                }
                case "_client-has-joined": {
                    this.kosyApp.onClientHasJoined?.((<PrivateClientHasJoined>eventData.message).clientInfo);
                    break;
                }
                case "_client-has-left": {
                    this.kosyApp.onClientHasLeft?.((<PrivateClientHasLeft>eventData.message).clientUuid);
                    break;
                }
                default: {
                    this.kosyApp.onReceiveMessageAsClient(<HostToClientMessage>eventData.message);
                    break;
                }
            }
            this.latestMessageNumber = eventData.messageNumber;
        } else {
            //If at first you don't succeed, try try and try again
            if (attemptNumber < 50 && this.latestMessageNumber < eventData.messageNumber) {
                setTimeout(() => this._handleReceiveMessageAsClientRecursive(eventData, initData, attemptNumber + 1), 100);
            }
            this.log("Timeout on processing message as client: ", eventData.message);
            this.log("Wait for Kosy to fix this mess...");
            //Whelp, you're fucked, wait for Kosy to help you fix this mess :)
        }
    }

    private _handleReceiveMessageAsClient(eventData: ReceiveMessageAsClient<HostToClientMessage>) {
        this.initialInfoPromise
            .then((initData) => {
                this.log("Received message as client, processing: ", eventData.message);
                this._handleReceiveMessageAsClientRecursive(eventData, initData, 0);
            });
    }

    private _handleReceiveMessageAsHost(eventData: ReceiveMessageAsHost<ClientToHostMessage>) {
        this.initialInfoPromise
            .then((initData) => {
                this.log("Trying to handle message as host");
                //Handle receiving the message as host
                const message = this.kosyApp.onReceiveMessageAsHost(eventData.message);
                if (message) {
                    this._relayMessageToClients(initData, message);
                }
            });
    }

    private log(...args: any[]) {
        if(localStorage.getItem("debug-mode") === "1") {
            console.log("From kosy-app-api: ", ...args);
        }
    }
}