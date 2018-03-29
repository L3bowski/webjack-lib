'use strict';

const Hand = require('../models/hand');
const cardService = require('./card-service');
const js = require('../utils/js-generics');

const getCards = (hand) => hand.cards;

const create = () => new Hand();

const getScore = (hand) => {
    var cardReducer = (result, card) => {
        return js.cartesianProduct(result, cardService.getValue(card), (x, y) => x + y);
    };
    var allScores = hand.cards.reduce(cardReducer, [0]);
    var score = allScores[0];
    for (var i = 1; i < allScores.length; ++i) {
        var potentialScore = allScores[i];
        if (potentialScore < 22) {
            score = potentialScore;
        }
    }
    return score;
};

const addCard = (hand, card) => {
    hand.cards.push(card);
    hand.score = getScore(hand);
    return hand.score;
};

const isBlackJack = (hand) => {
    var _isBlackJack = hand.score === 21 && hand.cards.length === 2;
    if (_isBlackJack) {
        hand.status = 'BlackJack';
    }
    return _isBlackJack;
};

const isOverMaxScore = (hand) => {
    var _isOverMaxScore = hand.score > 21;
    if (_isOverMaxScore) {
        hand.status = 'Loses';
    }
    return _isOverMaxScore;
};

const isSplitable = (hand) => hand.cards.length === 2 && cardService.getValue(hand.cards[0])[0] === cardService.getValue(hand.cards[1])[0];

const setStatus = (hand, status) => {
    hand.status = status;
};

module.exports = {
    addCard,
    getCards,
    create,
    getScore,
    isBlackJack,
    isOverMaxScore,
    isSplitable,
    setStatus
};
