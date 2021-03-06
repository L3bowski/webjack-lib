import { ICard } from '../types/card';
import { ICardSet } from '../types/card-set';
import { ITrainingSet } from '../types/training-set';

const relevantDealerHands = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'Figure'];

const splittableHands = [
    '2,2',
    '3,3',
    '4,4',
    '5,5', // Not relevant as splittable hand, but still there to train
    '6,6',
    '7,7',
    '8,8',
    '9,9',
    'Figure,Figure', // Not relevant as splittable hand, but still there to train
    'A,A'
];

const softHands = [
    'A,2',
    'A,3',
    'A,4',
    'A,5',
    'A,6',
    'A,7',
    'A,8',
    'A,9'
    // 'A,Figure' -> There is no decision to make since the hand is skipped
];

const hardHands = [
    '+5',
    '+6',
    '+7',
    '+8',
    '+9',
    '+10',
    '+11',
    '+12',
    '+13',
    '+14',
    '+15',
    '+16',
    '+17',
    '+18',
    '+19',
    '+20'
    // '+21' -> There is no decision to make since the hand is skipped
];

const relevantPlayerHands = [...splittableHands, ...softHands, ...hardHands];

export const createTrainingSet = (): ITrainingSet => ({
    currentRoundCards: [],
    dealerAvailableHands: [...relevantDealerHands],
    dealerCurrentHand: '',
    playerAvailableHands: [...relevantPlayerHands],
    playerUsedHands: [],
    progress: 0
});

const getCardFromCardSet = (symbol: string, cardSet: ICardSet): ICard => {
    // We search for the cards in the discardPile first to minimize the game interfering
    let card = getCardFromCollection(symbol, cardSet.discardPile);
    if (!card) {
        card = getCardFromCollection(symbol, cardSet.unusedCards);
    }
    return card!;
};

const getCardFromCollection = (symbol: string, cards: ICard[]): ICard | undefined => {
    let targetCard: ICard | undefined;
    // We iterate the cards set from end to beginning to minimize the game interfering
    for (let i = cards.length - 1; i >= 0; --i) {
        const card = cards[i];
        if (symbol === card.symbol) {
            targetCard = card;
            cards.splice(i, 1);
            break;
        }
    }
    return targetCard;
};

const getFigureSymbol = (): string => {
    return ['10', 'J', 'Q', 'K'][Math.floor(Math.random() * 3)];
};

const getHardHandSymbols = (value: number): string[] => {
    const minValue = Math.max(2, value - 10);
    const maxValue = Math.min(value - minValue, 10);

    let randomNumber = Math.floor(Math.random() * (maxValue - minValue) + minValue);
    let difference = value - randomNumber;

    // If numbers are equal, we would be training a splittable hand. Change them when possible
    // E.g. Transform a 7,7 (for 14) into a 6,8. Do not transform a 10,10 for 20
    if (randomNumber === difference && randomNumber > minValue && randomNumber < maxValue) {
        randomNumber++;
        difference--;
    }

    const firstCardSymbol = randomNumber === 10 ? getFigureSymbol() : randomNumber.toString();
    const secondCardSymbol = difference === 10 ? getFigureSymbol() : difference.toString();

    return [firstCardSymbol, secondCardSymbol];
};

const getRandomHandSymbols = (trainingSet: ITrainingSet): string[] => {
    const handsSet =
        trainingSet.playerAvailableHands.length > 0
            ? trainingSet.playerAvailableHands
            : trainingSet.playerUsedHands;

    const randomIndex = Math.floor(Math.random() * (handsSet.length - 1));
    const randomHand = handsSet[randomIndex];
    handsSet.splice(randomIndex, 1);
    trainingSet.playerUsedHands.push(randomHand);

    let symbols: string[] = [];
    const hardHandMatch = randomHand.match(/^\+(.*)$/);
    if (hardHandMatch) {
        symbols = getHardHandSymbols(parseInt(hardHandMatch[1], 10));
    } else {
        symbols = randomHand
            .replace(/Figure/, getFigureSymbol())
            .replace(/Figure/, getFigureSymbol())
            .split(',');
    }

    if (Math.floor(Math.random() * 100) % 2) {
        symbols = symbols.reverse();
    }

    return symbols;
};

export const setNextTrainingRound = (cardSet: ICardSet) => {
    const playersNumber = 7; // When using training hands there must always be 7 players playing
    updateTrainingSet(cardSet.trainingSet!);
    const playerCards = Array(playersNumber)
        .fill(0)
        .map(_ => {
            const symbols = getRandomHandSymbols(cardSet.trainingSet!);
            return {
                first: getCardFromCardSet(symbols[0], cardSet),
                second: getCardFromCardSet(symbols[1], cardSet)
            };
        });
    const playersFirstCard = playerCards.map(x => x.first);
    const dealerCard = getCardFromCardSet(
        cardSet.trainingSet!.dealerCurrentHand.replace(/Figure/, getFigureSymbol()),
        cardSet
    );
    const playersSecondCard = playerCards.map(x => x.second);
    cardSet.trainingSet!.currentRoundCards = playersFirstCard
        .concat([dealerCard])
        .concat(playersSecondCard);
};

const updateTrainingSet = (trainingSet: ITrainingSet) => {
    let mustUpdateDealerHand = trainingSet.dealerCurrentHand === '';

    if (trainingSet.playerAvailableHands.length === 0) {
        trainingSet.playerAvailableHands = [...relevantPlayerHands];
        trainingSet.playerUsedHands = [];
        mustUpdateDealerHand = true;
    }

    if (mustUpdateDealerHand) {
        if (trainingSet.dealerAvailableHands.length === 0) {
            trainingSet.dealerAvailableHands = [...relevantDealerHands];
        }

        const dealerIndex = Math.floor(
            Math.random() * (trainingSet.dealerAvailableHands.length - 1)
        );
        trainingSet.dealerCurrentHand = trainingSet.dealerAvailableHands[dealerIndex];
        trainingSet.dealerAvailableHands.splice(dealerIndex, 1);
    }

    const coveredDealerHands =
        relevantDealerHands.length - (trainingSet.dealerAvailableHands.length + 1);
    const coveredPlayerHands = relevantPlayerHands.length - trainingSet.playerAvailableHands.length;
    const coveredHands = coveredDealerHands * relevantPlayerHands.length + coveredPlayerHands;
    const totalHands = relevantDealerHands.length * relevantPlayerHands.length;
    trainingSet.progress = Math.min(100, Math.floor((coveredHands * 1000) / totalHands) / 10);
};
