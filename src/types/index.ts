export interface InitialInfo<AppState> {
    /// Information about all clients present
    clients: { [clientUuid: string]: ClientInfo };
    /// The current client's identifier
    currentClientUuid: string;
    /// The initializing client's identifier
    initializerClientUuid: string;
    currentAppState?: AppState;
    /// The location's unique identifier
    locationUuid: string;
    /// The location's name (can be undefined)
    locationName?: string;
}

export interface ClientInfo {
    clientUuid: string;
    clientName: string;
}