import { v4 as uuid } from 'uuid';
import { IPlayer } from '../models/player';
import { ITable } from '../models/table';
import { TableStatus } from '../types/table-status';
import { createCardSet } from './card-set-service';
import { getParameters } from './game-parameters-service';
import * as playerService from './player-service';

let tables: ITable[] = [];

export const addPlayer = (table: ITable, player: IPlayer) => table.players.push(player);

export const clearNextAction = (table: ITable) => {
    if (table.nextAction) {
        clearTimeout(table.nextAction as any);
    }
    table.nextAction = table.nextActionTimestamp = table.baseTimestamp = undefined;
};

export const createTable = (useTrainingSet = false) => {
    const table: ITable = {
        baseTimestamp: undefined,
        cardSet: createCardSet(useTrainingSet),
        dealer: playerService.createDealer(),
        id: uuid(),
        nextAction: undefined,
        nextActionTimestamp: undefined,
        players: [],
        status: TableStatus.Idle,
    };
    tables.push(table);
    return table;
};

export const deleteTable = (tableId: string) => {
    tables = tables.filter(table => table.id !== tableId);
};

export const getActivePlayers = (table: ITable) =>
    table.players.filter(playerService.isPlaying);

export const getAvailableTable = () => {
    const { maxPlayers } = getParameters();
    let table = tables.find(t => t.players.length < maxPlayers);
    if (!table) {
        table = createTable();
    }
    return table;
};

export const getCurrentPlayer = (table: ITable): IPlayer | undefined => {
    return table.status === TableStatus.PlayerTurns ?
        table.players.find(player => !!playerService.getCurrentHand(player)) :
        undefined;
};

export const getPlayerById = (table: ITable, playerId: string) => table.players.find(p => p.id === playerId);

export const getTableById = (tableId: string) => tables.find(t => t.id == tableId);    

export const removePlayer = (table: ITable, playerId: string) => {
    table.players = table.players.filter(player => player.id !== playerId);
};

export const setStatus = (table: ITable, status: TableStatus) => {
    table.status = status;
};

export const setNextAction = (table: ITable, delay: number, nextAction: (...args: any[]) => void) => {
    table.nextAction = setTimeout(nextAction, delay * 1000) as any;
    table.nextActionTimestamp = Date.now() + delay * 1000;
};