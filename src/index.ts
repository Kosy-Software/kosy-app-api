import { InitialInfo, ClientInfo } from './types';
import { KosyToAppMessage, AppToKosyMessage } from './messages/index';

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
export class KosyApi<AppState, AppMessage> {
    private kosyApp: IKosyApp<AppState, AppMessage>;
    private kosyClient: Window = window.parent;

    constructor(kosyApp: IKosyApp<AppState, AppMessage>) {
        this.kosyApp = kosyApp;
    }

    public startApp(): Promise<InitialInfo<AppState>> {
        return new Promise((resolve, reject) => {
            window.addEventListener("message", (event: MessageEvent<KosyToAppMessage<AppState, AppMessage>>) => {
                let message = event.data;
                switch (message.type) {
                    case "receive-initial-info":
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
     * This kills the app -> no further processing will be available
     */
    public stopApp() {
        this._sendMessageToKosy({ type: "stop-app", payload: {} });
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