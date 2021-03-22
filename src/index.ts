import { InitialInfo, ClientInfo } from './lib/types';

type AppToKosyMessage<AppState, AppMessage> =
    | ReadyAndListening
    | RelayMessage<AppMessage>
    | ReceiveAppState<AppState>
    | EndApp
    
interface ReadyAndListening {
    type: "ready-and-listening";
    payload: any; //not known yet -> should probably contain an integration identifier
}

interface ReceiveAppState<AppState> {
    type: "receive-app-state";
    payload: AppState
}

interface RelayMessage<AppMessage> {
    type: "relay-message";
    payload: AppMessage;
}

interface EndApp {
    type: "end-app";
    payload: any; //not known yet -> should probably contain an integration identifier
}

type KosyToAppMessage<AppState, AppMessage> =    
    | ReceiveInitialInfo<AppState>
    | RequestAppState
    | ClientHasJoined
    | ClientHasLeft
    | ReceiveMessage<AppMessage>

/// Note: this message is also used when the client info has changed (e.g. seat number or name)
interface ReceiveInitialInfo<AppState> {
    type: "receive-initial-info";
    payload: InitialInfo<AppState>
}

interface RequestAppState {
    type: "request-app-state";
    payload: {}
}

/// Note: this message is also used when the client info has changed (e.g. seat number or name)
interface ClientHasJoined {
    type: "client-has-joined";
    payload: ClientInfo;
}

interface ClientHasLeft {
    type: "client-has-left";
    payload: ClientInfo;
}

interface ReceiveMessage<AppMessage> {
    type: "receive-message";
    payload: AppMessage;
}

/**
 * The interface used to start up a kosy app
 * You will need to provide the interface with the type of app state and message type your app uses.
 */
export interface IKosyApp<AppState, AppMessage> {
    /**
     * When a new client joins, Kosy does not know the state of the app. This method will be called by Kosy to fetch the app state.
     * @returns Your app's state
     */
    onRequestState(): AppState;

    /**
     * Will be called when a new Kosy client joins
     * @param clientInfo The information about the new client
     */
    onClientHasJoined(clientInfo: ClientInfo): void;

    /**
     * Will be called whenever a Kosy client leaves
     * @param clientInfo The information about the leaving client
     */
    onClientHasLeft(clientInfo: ClientInfo): void;

    /**
     * Receives a message from Kosy, most likely from another app client.
     * @param message The message that was sent through the Kosy network to the current app
     */
    onReceiveMessage(message: AppMessage): void;
}

/**
 * An app proxy you can use to notify Kosy that your app has started (start) 
 * and to relay messages to all other clients in the Kosy room (relayMessage)
 * 
 * All messages that come in via Kosy are delegated to functions you need to provide in the constructor.
 */
export class KosyAppProxy<AppState, AppMessage> {
    private kosyApp: IKosyApp<AppState, AppMessage>;
    private kosyClient: Window = window.parent;

    constructor(kosyApp: IKosyApp<AppState, AppMessage>) {
        this.kosyApp = kosyApp;
    }

    public start(): Promise<InitialInfo<AppState>> {
        return new Promise((resolve, reject) => {
            window.addEventListener("message", (event: MessageEvent<KosyToAppMessage<AppState, AppMessage>>) => {
                //Time out after 10 seconds if the initial info was not received -> send end app to Kosy
                let timeout = setTimeout(() => {
                    reject();
                    this._sendMessageToKosy({ type: "end-app", payload: {} });
                }, 10000);

                let message = event.data;
                switch (message.type) {
                    case "receive-initial-info":
                        clearTimeout(timeout);
                        resolve (message.payload);
                        break;
                    case "client-has-joined":
                        this.kosyApp.onClientHasJoined(message.payload);
                        break;
                    case "client-has-left":
                        this.kosyApp.onClientHasLeft(message.payload);
                        break;
                    case "request-app-state":
                        const state = this.kosyApp.onRequestState();
                        this._sendMessageToKosy({ type: "receive-app-state", payload: state });
                        break;
                    case "receive-message":
                        this.kosyApp.onReceiveMessage(message.payload);
                        break;
                    default:
                        break;
                }
            });
            this._sendMessageToKosy({ type: "ready-and-listening", payload: {} });
        });
    }

    /**
     * Relays a message to the Kosy P2P network
     * @param message the message to relay through the Kosy P2P network 
     */
     public relayMessage(message: AppMessage) {
        this._sendMessageToKosy({ type: "relay-message", payload: message });
    }

    private _sendMessageToKosy (message: AppToKosyMessage<AppState, AppMessage>) {
        this.kosyClient.postMessage(message, "*");
    }
}