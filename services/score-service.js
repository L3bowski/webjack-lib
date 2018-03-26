'use strict';

const js = require('../utils/js-generics');
const HandScore = require('../models/hand-score');
const cardService = require('./card-service');

const addCardScore = (handScore, card) => {
    var value = cardService.getValue(card);
    if (cardService.isAce(card)) {
        handScore.min += 1;
        handScore.max += (handScore.max + 11 > 21 ? 1 : 11);
    }
    else {
        handScore.min += value;
        handScore.max += value;
    }
}

const getHandScore = (hand) => {
    var handScore = new HandScore();
    var sortedHand = js.clone(hand.cards)
    .sort((a, b) => {
        return cardService.getValue(a) > cardService.getValue(b);
    });

    js.iterate(sortedHand, (card) => {
        addCardScore(handScore, card);
    });

    if (handScore.max > 21 || handScore.min === handScore.max) {
        handScore.effective = handScore.min;
    }
    else {
        handScore.effective = handScore.max;
    }

    return handScore;
}

module.exports = {
    getHandScore
};
