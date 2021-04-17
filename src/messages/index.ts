import { InitialInfo, ClientInfo } from '../types';

export type AppToKosyMessage<AppState, AppMessage> =
    | ReadyAndListening
    | RelayMessage<AppMessage>
    | ReceiveAppState<AppState>
    | StopApp
    | RefreshAppState
    
export interface ReadyAndListening {
    type: "ready-and-listening";
}

export interface ReceiveAppState<AppState> {
    type: "receive-app-state";
    clientUuids: string[];
    payload: AppState;
}

export interface RelayMessage<AppMessage> {
    type: "relay-message";
    payload: AppMessage;
}

export interface StopApp {
    type: "stop-app";
}

export interface RefreshAppState {
    type: "refresh-app-state";
}

export type KosyToAppMessage<AppState, AppMessage> =    
    | ReceiveInitialInfo<AppState>
    | GetAppState
    | SetAppState<AppState>
    | ClientHasJoined
    | ClientHasLeft
    | ReceiveMessage<AppMessage>

/// Note: this message is also used when the client info has changed (e.g. seat number or name)
export interface ReceiveInitialInfo<AppState> {
    type: "receive-initial-info";
    payload: InitialInfo<AppState>
}

export interface GetAppState {
    type: "get-app-state";
    clientUuids: string[];
}

export interface SetAppState<AppState> {
    type: "set-app-state";
    state: AppState;
}

/// Note: this message is also used when the client info has changed (e.g. seat number or name)
export interface ClientHasJoined {
    type: "client-has-joined";
    payload: ClientInfo;
}

export interface ClientHasLeft {
    type: "client-has-left";
    clientUuid: string;
}

export interface ReceiveMessage<AppMessage> {
    type: "receive-message";
    payload: AppMessage;
}