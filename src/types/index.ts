export interface InitialInfo<AppState> {
    /// Information about all clients present
    clients: { [clientUuid: string]: ClientInfo };
    /// The current client's identifier
    currentClientUuid: string;
    /// The initializing client's identifier
    initializerClientUuid: string;
    currentAppState?: AppState
}

export interface ClientInfo {
    clientUuid: string;
    clientName: string;
    clientLocation: ClientLocation;
}

export type ClientLocation =
    | SeatedAtTable

export interface SeatedAtTable {
    type: "seated-at-table";
    building: Building;
    floor: Floor;
    room: Room;
    table: Table;
    seatNumber: number;
}

export interface Building {
    buildingKey: string;
    buildingName: string;
}

export interface Floor {
    floorUuid: string;
    floorName: string
}

export interface Room {
    roomUuid: string;
    roomName: string;
}

export interface Table {
    tableUuid: string;
    tableName: string;
    numberOfSeats: number;
}