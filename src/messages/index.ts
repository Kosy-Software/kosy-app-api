import { InitialInfo, ClientInfo } from '../types';

export type AppToKosyMessage<AppState, AppMessage> =
    | ReadyAndListening
    | RelayMessage<AppMessage>
    | ReceiveAppState<AppState>
    | StopApp
    
export interface ReadyAndListening {
    type: "ready-and-listening";
    payload: any; //not known yet -> should probably contain an app identifier
}

export interface ReceiveAppState<AppState> {
    type: "receive-app-state";
    payload: AppState
}

export interface RelayMessage<AppMessage> {
    type: "relay-message";
    payload: AppMessage;
}

export interface StopApp {
    type: "stop-app";
    payload: any; //not known yet -> should probably contain an app identifier
}

export type KosyToAppMessage<AppState, AppMessage> =    
    | ReceiveInitialInfo<AppState>
    | RequestAppState
    | ClientHasJoined
    | ClientHasLeft
    | ReceiveMessage<AppMessage>

/// Note: this message is also used when the client info has changed (e.g. seat number or name)
export interface ReceiveInitialInfo<AppState> {
    type: "receive-initial-info";
    payload: InitialInfo<AppState>
}

export interface RequestAppState {
    type: "request-app-state";
    payload: {}
}

/// Note: this message is also used when the client info has changed (e.g. seat number or name)
export interface ClientHasJoined {
    type: "client-has-joined";
    payload: ClientInfo;
}

export interface ClientHasLeft {
    type: "client-has-left";
    payload: ClientInfo;
}

export interface ReceiveMessage<AppMessage> {
    type: "receive-message";
    payload: AppMessage;
}