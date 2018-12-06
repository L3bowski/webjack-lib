import { Hand } from '../models/hand';
import { HandStatus } from '../models/hand-status';
import { Player } from '../models/player';
import { Table } from '../models/table';
import blackJackService from './black-jack-service';
import cardSetService from './card-set-service';
import handService from './hand-service';
import playerService from './player-service';
import tableService from './table-service';

const gameParameters = require('../../game-parameters');

// TODO Access to models properties should be done in the model service
// e.g. table.players.forEach(whatever) => tableService.whatever

const endRound = (table: Table) => {
    tableService.clearTrigger(table);
    cardSetService.collectPlayedCards(table.cardSet);
    const players = tableService.getPlayers(table);
    players.forEach(player => playerService.setHands(player, []));
    playerService.setHands(table.dealer, []);
    tableService.setIsRoundBeingPlayed(table, false);
};

const _makeDecision = (table: Table, player: Player, decision: string) => {
    tableService.clearTrigger(table);
    try {
        switch (decision) {
            case 'Double': {
                blackJackService.doublePlayerHand(player, tableService.getCardSet(table));
                break;
            }
            case 'Hit': {
                blackJackService.hitPlayerHand(player, tableService.getCardSet(table));
                break;
            }
            case 'Split': {
                blackJackService.splitPlayerHand(player, tableService.getCardSet(table));
                break;
            }
            case 'Stand': {
                blackJackService.standPlayerHand(player);
                break;
            }
            default:
                throw 'Action not supported';
        }
        moveRoundForward(table);
    }
    catch (error) {
        // If an error is raised (e.g. doubling when not allowed), we set the trigger again
        setMakeDecisionTrigger(table, player);
        throw error;
    }
};

const makeDecision = (table: Table, playerId: string, decision: string) => {
    const currentPlayer = tableService.getCurrentPlayer(table);
    if (!currentPlayer) {
        throw 'No one is playing now';
    }

    if (currentPlayer.id !== playerId) {
        throw 'Not allowed to play now. It is ' + currentPlayer.name + '\'s turn';
    }

    _makeDecision(table, currentPlayer, decision);
};

const makeVirtualDecision = (table: Table, decision: string) => {
    const currentPlayer = tableService.getCurrentPlayer(table);
    _makeDecision(table, currentPlayer, decision);
};

const moveRoundForward = (table: Table) => {
    const currentPlayer = tableService.getCurrentPlayer(table);
    if (tableService.isDealer(table, currentPlayer)) {
        // All players have completed their hands; time to play dealer's turn
        setPlayDealerTurnTrigger(table);
    }
    else {
        const currentHand = playerService.getCurrentHand(currentPlayer);

        if (blackJackService.wasHandSplit(currentHand)) {
            blackJackService.dealCard(currentHand, tableService.getCardSet(table));
        }

        const isHandFinished = updateHandStatus(currentHand);
        if (isHandFinished) {
            moveRoundForward(table);
        }
        else {
            setMakeDecisionTrigger(table, currentPlayer);
        }
    }
};

const placeBet = (table: Table, playerId: string, bet: number) => {
    const player = table.players.find(p => p.id == playerId);
    if (!player) {
        throw 'No player identified by ' + playerId + ' was found';
    }

    if (tableService.isRoundBeingPlayed(table)) {
        throw 'Bets can only be placed before a round starts';
    }

    const hand = handService.create(bet);
    playerService.setHands(player, [hand]);
    playerService.increaseEarningRate(player, -bet);

    if (!tableService.hasTrigger(table)) {
        setStartRoundTrigger(table);
    }
};

const playDealerTurn = (table: Table) => {
    tableService.clearTrigger(table);

    const dealer = tableService.getDealer(table);
    const dealerHand = playerService.getCurrentHand(dealer);
    let dealerHandValue = 0; // DRY optimization to get the second card inside the interval

    const dealerInterval = setInterval(() => {
        if (dealerHandValue < 17) {
            blackJackService.dealCard(dealerHand, tableService.getCardSet(table));
            dealerHandValue = handService.getValue(dealerHand);
        }
        else {
            clearInterval(dealerInterval);
            handService.markAsPlayed(dealerHand);
            const players = tableService.getPlayers(table);
            updatePlayersEarnings(players, dealerHand);
        
            setEndRoundTrigger(table);
        }
    }, 1000);
};

const setStartRoundTrigger = (table: Table) => {
    tableService.clearTrigger(table);
    tableService.setTrigger(table, 7, () => startRound(table));
};

const setMakeDecisionTrigger = (table: Table, player: Player) =>
    tableService.setTrigger(table, 20, () => blackJackService.standPlayerHand(player));

const setPlayDealerTurnTrigger = (table: Table) =>
    tableService.setTrigger(table, 3, () => playDealerTurn(table));

const setEndRoundTrigger = (table: Table) =>
    tableService.setTrigger(table, 5, () => endRound(table));

const startRound = (table: Table) => {
    tableService.clearTrigger(table);

    updatePlayersInactivity(table);
    const activePlayers = table.players.filter(playerService.hasHands);
    
    tableService.setIsRoundBeingPlayed(table, true);
    
    const playersHand = activePlayers.map(playerService.getCurrentHand);
    playersHand.forEach(hand => blackJackService.dealCard(hand, tableService.getCardSet(table)));

    const dealer = tableService.getDealer(table);
    const dealerHand = handService.create(0);
    playerService.setHands(dealer, [dealerHand]);
    blackJackService.dealCard(dealerHand, tableService.getCardSet(table));

    playersHand.forEach(hand => {
        blackJackService.dealCard(hand, tableService.getCardSet(table));
        const isBlackJack = blackJackService.isBlackJack(hand);
        if (isBlackJack) {
            handService.setStatus(hand, HandStatus.BlackJack);
            handService.markAsPlayed(hand);
        }
    });

    moveRoundForward(table);
};

const updateHandStatus = (playerHand: Hand) => {
    const isBlackJack = blackJackService.isBlackJack(playerHand);
    const isBurned = blackJackService.isBurned(playerHand);
    const isMaxValue = blackJackService.isMaxValue(playerHand);

    if (isBurned) {
        handService.setStatus(playerHand, HandStatus.Burned);
    }
    else if (isBlackJack) {
        handService.setStatus(playerHand, HandStatus.BlackJack);
    }
    
    const isHandFinished = isBlackJack || isBurned || isMaxValue;
    
    if (isHandFinished) {
        handService.markAsPlayed(playerHand);
    }

    return isHandFinished;
};

const updatePlayersEarnings = (players: Player[], dealerHand: Hand) => {
    players.forEach(player => {
        const playerHands = playerService.getHands(player);
        const handsEarnings = playerHands.map(hand => {
            const handEarnings = blackJackService.getHandEarnings(hand, dealerHand);
            handService.setBet(hand, 0);
            return handEarnings;
        });
        const earningRate = handsEarnings.reduce((x, y) => x + y, 0);
        playerService.updateEarningRate(player, earningRate);
    });
};

const updatePlayersInactivity = (table: Table) => {
    const players = tableService.getPlayers(table);
    const activePlayers = players.filter(playerService.hasHands);
    const inactivePlayers = players.filter(p => !playerService.hasHands(p));

    activePlayers.forEach(p => p.inactiveRounds = 0);
    inactivePlayers.forEach(p => {
        playerService.increaseInactiveRounds(p);
        if (p.inactiveRounds > gameParameters.maxInactiveRounds) {
            tableService.removePlayer(table.id, p.id);
        }
    });
};

export {
    makeDecision,
    makeVirtualDecision,
    placeBet
};

export default {
    makeDecision,
    makeVirtualDecision,
    placeBet
};
