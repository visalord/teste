﻿/**
 * Copyright 2014 Node Dice
 *
 * Created by Neo on 2014/11/27.
 */
'use strict';

var config = require("../../config"),
    uuid = require('node-uuid'),
    userHelper = require('../helper/userHelper'),
    betHelper = require('../helper/betHelper'),
    rollDice = require('../helper/cryptoroll');

module.exports = function (io) {
    
    var nsp = io.of('/overunder');
    nsp.on('connection', function (socket) {
        
        socket.join('overunder');
        
        var session = socket.handshake.session;
        //return a 
        socket.on('roll', function (clientBet) {
            userHelper.GetUserById(session.userid, "clientSalt serverSalt nonce", function (err, u) {
                if (err)
                    socket.emit('roll', { clientSalt: '', error: err });
                else {
                    //increase nonce
                    u.nonce++;
                    u.save();
                    //get lucky number
                    var num = rollDice(u.serverSalt, u.clientSalt + '-' + u.nonce);
                    var bet = new betHelper.Bet({
                        userid: session.userid,
                        clientSalt: u.clientSalt,
                        serverSalt: u.serverSalt,
                        nonce: u.nonce,
                        amount: clientBet.w,
                        selNum: clientBet.sn,
                        unit: clientBet.coinName,
                        betTime: new Date(),
                        rollNum: num,
                        betId: uuid.v4()
                    });
                    bet.save(function (err) {
                        if (err) return console.error('Saving bet error:' + err);
                    });
                    //Todo: process bet's result here
                    
                    //return number to the client and show the result on the page.
                    socket.emit('roll', {
                        rollNum: num, 
                        nonce: u.nonce, 
                        betTime: bet.betTime, 
                        selNum: bet.selNum,
                        amount: bet.amount,
                        unit: bet.unit
                    });
                    
                    //Here, every bet is sent to every one who is in over/under game. 
                    //But you may not want to do that.
                    nsp.to('overunder').emit('allbets', {
                        rollNum: num, 
                        nonce: u.nonce, 
                        betTime: bet.betTime, 
                        selNum: bet.selNum,
                        amount: bet.amount,
                        unit: bet.unit
                    });

                }
            });
           
        });
        
        socket.on('getMyBets', function () {
            betHelper.getBetsByUser(session.userid, function (err, bets) {
                socket.emit('getMyBets', bets);
            });
        });
        
        socket.on('getAllBets', function () {
            betHelper.getAllBets(function (err, bets) {
                socket.emit('getAllBets', bets);
            });
        });
    });
}