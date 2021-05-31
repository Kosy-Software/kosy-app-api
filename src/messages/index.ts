import { InitialInfo, ClientInfo } from '../types';

export type AppToKosyMessage<AppState, ClientToHostMessage, HostToClientMessage> =
    | ReadyAndListening
    | RelayMessageToHost<ClientToHostMessage>
    | RelayMessageToClients<HostToClientMessage>
    | ReceiveAppState<AppState>
    | StopApp
    | RefreshAppState
    
export interface ReadyAndListening {
    type: "ready-and-listening";
}

export interface ReceiveAppState<AppState> {
    type: "receive-app-state";
    clientUuids: string[];
    state: AppState;
    latestMessageNumber: number;
}

export interface RelayMessageToHost<ClientToHostMessage> {
    type: "relay-message-to-host";
    message: ClientToHostMessage;
}

export interface RelayMessageToClients<HostToClientMessage> {
    type: "relay-message-to-clients";
    message: HostToClientMessage;
    messageNumber: number;
    sentByClientUuid: string;
}

export interface StopApp {
    type: "stop-app";
}

export interface RefreshAppState {
    type: "refresh-app-state";
}

export type KosyToAppMessage<AppState, ClientToHostMessage, HostToClientMessage> =    
    | ReceiveInitialInfo<AppState>
    | GetAppState
    | SetAppState<AppState>
    | SetHost
    | ClientHasJoined
    | ClientHasLeft
    | ReceiveMessageAsHost<ClientToHostMessage>
    | ReceiveMessageAsClient<HostToClientMessage>

/// Note: this message is also used when the client info has changed (e.g. seat number or name)
export interface ReceiveInitialInfo<AppState> {
    type: "receive-initial-info";
    payload: InitialInfo<AppState>
    latestMessageNumber: number;
}

export interface GetAppState {
    type: "get-app-state";
    clientUuids: string[];
}

export interface SetAppState<AppState> {
    type: "set-app-state";
    state: AppState;
    latestMessageNumber: number;
}

/// Note: this message is also used when the client info has changed (e.g. seat number or name)
export interface ClientHasJoined {
    type: "client-has-joined";
    clientInfo: ClientInfo;
}

export interface ClientHasLeft {
    type: "client-has-left";
    clientUuid: string;
}

export interface SetHost {
    type: "set-host";
    clientUuid: string;
}

export interface ReceiveMessageAsHost<ClientToHostMessage> {
    type: "receive-message-as-host";
    message: ClientToHostMessage;
}

export interface ReceiveMessageAsClient<HostToClientMessage> {
    type: "receive-message-as-client";
    message: HostToClientMessage;
    messageNumber: number;
    sentByClientUuid: string;
}