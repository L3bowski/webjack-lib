'use strict';

let Hand = require('../models/hand');
let cardService = require('./card-service');
let scoreService = require('./score-service');
let js = require('../utils/js-generics');

function handService() {

    function addCard(hand, card) {
        hand.hasAce = hand.hasAce || cardService.isAce(card);
        hand.cards.push(card);
        hand.score = scoreService.getHandScore(hand);
    }

    function clear(hand) {
        var cards = hand.cards;
        hand.cards = [];
        hand.hasAce = false;
        hand.status = null;
        return cards;
    }

    function create() {
        return new Hand();
    }

    function getScore(hand) {
        return scoreService.getHandScore(hand).effective;
    }

    function isSplitable(hand) {
        return (hand.cards.length === 2 &&
        cardService.getValue(hand.cards[0]) === cardService.getValue(hand.cards[1]));
    }

    function setStatus(hand, status) {
        hand.status = status;
    }

    return {
        addCard,
        clear,
        create,
        getScore,
        isSplitable,
        setStatus
    };
}

module.exports = handService();
