/**
 * Blockly Games: Genetics
 *
 * Copyright 2016 Google Inc.
 * https://github.com/google/blockly-games
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview JavaScript for the visualization of the Genetics game.
 * @author kozbial@google.com (Monica Kozbial)
 */
'use strict';

goog.provide('Genetics.Visualization');

goog.require('Genetics.Cage');
goog.require('goog.object');



/**
 * Frames per second to draw.  Has no impact on game play, just the display.
 */
Genetics.Visualization.FPS = 36;

/**
 * Mapping of mouse id to mouse for mice currently being visualized.
 * @type {!Object.<string, Genetics.Mouse>}
 */
Genetics.Visualization.MICE = {};

/**
 * List that specifies the order of players in the data tables for the charts.
 * @type {Array.<string>}
 * @private
 */
Genetics.Visualization.playerOrder_ = [];

/**
 * Chart wrapper for chart with mice sex to count.
 * @type {google.visualization.ChartWrapper}
 * @private
 */
Genetics.Visualization.populationChartWrapper_ = null;

/**
 * Chart wrapper for chart with count of pickFight owners.
 * @type {google.visualization.ChartWrapper}
 * @private
 */
Genetics.Visualization.pickFightChartWrapper_ = null;

/**
 * Chart wrapper for chart with count of chooseMate owners.
 * @type {google.visualization.ChartWrapper}
 * @private
 */
Genetics.Visualization.chooseMateChartWrapper_ = null;

/**
 * Chart wrapper for chart with count of mateAnswer owners.
 * @type {google.visualization.ChartWrapper}
 * @private
 */
Genetics.Visualization.mateAnswerChartWrapper_ = null;

/**
 * Mapping of mouse sex to number of mice.
 * @type {!Object.<Genetics.Mouse.Sex, number>}
 * @private
 */
Genetics.Visualization.mouseSexes_ = {};

/**
 * Mapping of player id to number of mice with pickFight function of that
 * player.
 * @type {!Object<number, number>}
 * @private
 */
Genetics.Visualization.pickFightOwners_ = {};

/**
 * Mapping of player id to number of mice with chooseMate function of that
 * player.
 * @type {!Object<number, number>}
 * @private
 */
Genetics.Visualization.chooseMateOwners_ = {};

/**
 * Mapping of player id to number of mice with mateAnswer function of that
 * player.
 * @type {!Object<number, number>}
 * @private
 */
Genetics.Visualization.mateAnswerOwners_ = {};

/**
 * PID of executing task.
 * @type {number}
 */
Genetics.Visualization.pid = 0;

/**
 * Setup the visualization (run once).
 */
Genetics.Visualization.init = function() {
  var createCharts = function() {
    // Create the base options for chart style shared between charts.
    var chartOpts = {
      'hAxis': {'title': 'Time', 'titleTextStyle': {'color': '#333'}, 'format': '0'},
      'vAxis': {'minValue': 0, 'format': '0', 'min': 0},
      'chartArea': { 'left': '8%', 'top': '8%', 'width': '60%', 'height': '70%' }
    };
    var populationChartOpts = chartOpts;
    var pickFightOpts = goog.object.clone(chartOpts);
    var chooseMateOpts = goog.object.clone(chartOpts);
    var mateAnswerOpts = goog.object.clone(chartOpts);

    populationChartOpts['title'] = 'Population';
    populationChartOpts['colors'] = ['#AA8CC5', '#ADD8E6', '#FFB5C1'];
    populationChartOpts['isStacked'] = true;
    Genetics.Visualization.populationChartWrapper_ =
        new google.visualization.ChartWrapper({
          'chartType': 'AreaChart',
          'options': populationChartOpts,
          'containerId': 'populationChart'
        });
    pickFightOpts['title'] = 'Pick Fight';
    Genetics.Visualization.pickFightChartWrapper_ =
        new google.visualization.ChartWrapper({
          'chartType': 'LineChart',
          'options': pickFightOpts,
          'containerId': 'pickFightChart'
        });
    chooseMateOpts['title'] = 'Choose Mate';
    Genetics.Visualization.chooseMateChartWrapper_ =
        new google.visualization.ChartWrapper({
          'chartType': 'LineChart',
          'options': chooseMateOpts,
          'containerId': 'chooseMateChart'
        });
    mateAnswerOpts['title'] = 'Mate Answer';
    Genetics.Visualization.mateAnswerChartWrapper_ =
        new google.visualization.ChartWrapper({
          'chartType': 'LineChart',
          'options': mateAnswerOpts,
          'containerId': 'mateAnswerChart'
        });

    // Set chart Data for all charts.
    Genetics.Visualization.resetChartData_();

    Genetics.Visualization.populationChartWrapper_.draw();
    Genetics.Visualization.pickFightChartWrapper_.draw();
    Genetics.Visualization.chooseMateChartWrapper_.draw();
    Genetics.Visualization.mateAnswerChartWrapper_.draw();
  };
  google.charts.load('current', {'packages': ['corechart']});
  google.charts.setOnLoadCallback(createCharts);
};

/**
 * Stop visualization.
 */
Genetics.Visualization.stop = function() {
  clearTimeout(Genetics.Visualization.pid);
};

Genetics.Visualization.resetChartData_ = function() {
  Genetics.Visualization.populationChartWrapper_.setDataTable(
      google.visualization.arrayToDataTable(
          [[{label: 'Time', type: 'number'},
            {label: Genetics.Mouse.Sex.HERMAPHRODITE, type: 'number'},
            {label: Genetics.Mouse.Sex.MALE, type: 'number'},
            {label: Genetics.Mouse.Sex.FEMALE, type: 'number'}]],
          false));

  // Create list of player labels and store order of players to use when
  // population data updates.
  Genetics.Visualization.playerOrder_.length = 0;
  var playerLabels = [{label: 'Time', type: 'number'}];
  for (var playerId in Genetics.Cage.PLAYERS) {
    if (Genetics.Cage.PLAYERS.hasOwnProperty(playerId)) {
      playerLabels.push({label: Genetics.Cage.PLAYERS[playerId][0],
        type: 'number'});
      Genetics.Visualization.playerOrder_.push(playerId);
    }
  }
  Genetics.Visualization.pickFightChartWrapper_.setDataTable(
      google.visualization.arrayToDataTable([playerLabels], false));
  Genetics.Visualization.chooseMateChartWrapper_.setDataTable(
      google.visualization.arrayToDataTable([playerLabels], false));
  Genetics.Visualization.mateAnswerChartWrapper_.setDataTable(
      google.visualization.arrayToDataTable([playerLabels], false));
};

/**
 * Stop and reset the visualization.
 */
Genetics.Visualization.reset = function() {
  Genetics.Visualization.stop();

  // Reset stored information about mouse population.
  Genetics.Visualization.roundNumber = 0;
  Genetics.Visualization.mouseSexes_[Genetics.Mouse.Sex.HERMAPHRODITE] = 0;
  Genetics.Visualization.mouseSexes_[Genetics.Mouse.Sex.MALE] = 0;
  Genetics.Visualization.mouseSexes_[Genetics.Mouse.Sex.FEMALE] = 0;
  Genetics.Visualization.MICE = {};
  Genetics.Visualization.pickFightOwners_ = {};
  Genetics.Visualization.chooseMateOwners_ = {};
  Genetics.Visualization.mateAnswerOwners_ = {};
  // Clear chart and set labels for data table.
  Genetics.Visualization.resetChartData_();
  // Set count for all players to 0.
  for (var i = 0; i < Genetics.Visualization.playerOrder_.length; i++) {
    var playerId = Genetics.Visualization.playerOrder_[i];
    Genetics.Visualization.pickFightOwners_[playerId] = 0;
    Genetics.Visualization.chooseMateOwners_[playerId] = 0;
    Genetics.Visualization.mateAnswerOwners_[playerId] = 0;
  }
};

/**
 * Time when the previous frame was drawn.
 */
Genetics.Visualization.lastFrame = 0;

/**
 * Delay between previous frame was drawn and the current frame was scheduled.
 */
Genetics.Visualization.lastDelay = 0;

/**
 * Start the visualization running.
 */
Genetics.Visualization.start = function() {
  Genetics.Visualization.update();
};

/**
 * Start the visualization running.
 */
Genetics.Visualization.update = function() {
  Genetics.Visualization.display_();
  Genetics.Visualization.processCageEvents_();
  // Frame done.  Calculate the actual elapsed time and schedule the next frame.
  var now = Date.now();
  var workTime = now - Genetics.Visualization.lastFrame -
      Genetics.Visualization.lastDelay;
  var delay = Math.max(1, (1000 / Genetics.Visualization.FPS) - workTime);
  Genetics.Visualization.pid = setTimeout(Genetics.Visualization.update, delay);
  Genetics.Visualization.lastFrame = now;
  Genetics.Visualization.lastDelay = delay;
};

/**
 * Visualize the current state of the cage simulation (Genetics.Cage).
 * @private
 */
Genetics.Visualization.display_ = function() {
  // TODO(kozbial) draw current state of the screen.
  Genetics.Visualization.populationChartWrapper_.draw();
  Genetics.Visualization.pickFightChartWrapper_.draw();
  Genetics.Visualization.chooseMateChartWrapper_.draw();
  Genetics.Visualization.mateAnswerChartWrapper_.draw();
};

Genetics.Visualization.roundNumber = 0;

/**
 * Returns a string representation of a mouse's properties
 * @param {Genetics.Mouse} mouse The mouse to get information from.
 * @return {String} A string representation of the mouse containing information
 * about the mouse.
 * @private
 */
Genetics.Visualization.getMouseInfo_ = function(mouse) {
  return 'Mouse' + mouse.id + '(sex:' + mouse.sex + ' , size:' + mouse.size +
      ' , aggressiveness:' + mouse.startAggressiveness + ' , fertility:' +
      mouse.startFertility + ' , pickFight:' + mouse.pickFightOwner +
      '/chooseMate:' + mouse.chooseMateOwner + '/mateAnswer:' +
      mouse.mateAnswerOwner + ')';
};

/**
 * Process events in Cage events queue.
 * @private
 */
Genetics.Visualization.processCageEvents_ = function() {
  // Handle any queued events.
  var getMouseName =  Genetics.Visualization.getMouseName;
  while (Genetics.Cage.EVENTS.length) {
    var event = Genetics.Cage.EVENTS.shift();
    switch (event['TYPE']) {
      case 'ADD':
        var mouse = event['MOUSE'];
        Genetics.Visualization.addMouse_(mouse);
        console.log(getMouseName(mouse, true, true) + ' added to game.');
        break;
      case 'START_GAME':
        Genetics.Visualization.updateChartData();
        break;
      case 'FIGHT':
          var instigatingMouse = Genetics.Visualization.MICE[event['ID']];
        switch (event['RESULT']) {
          case 'NONE':
            console.log(getMouseName(instigatingMouse) +
                ' elected to never fight again.');
            break;
          case 'INVALID':
            console.log(getMouseName(instigatingMouse) +
                ' is confused and wont fight again.');
            break;
          case 'SELF':
            console.log(getMouseName(instigatingMouse) +
                ' chose itself when asked whom to fight with.' +
                getMouseName(instigatingMouse) + ' is being executed to put ' +
                'it out of its misery.');
            Genetics.Visualization.removeMouse_(instigatingMouse);
            break;
          case 'WIN':
            var opponent = Genetics.Visualization.MICE[event['OPT_OPPONENT']];
            console.log(getMouseName(instigatingMouse) + 'fights and kills ' +
                getMouseName(opponent) + '.');
            Genetics.Visualization.removeMouse_(opponent.id);
            break;
          case 'TIE':
            var opponent = Genetics.Visualization.MICE[event['OPT_OPPONENT']];
            console.log(getMouseName(instigatingMouse) + 'fights ' +
                getMouseName(opponent) + ' to a draw.');
            break;
          case 'LOSS':
            var opponent = Genetics.Visualization.MICE[event['OPT_OPPONENT']];
            console.log(getMouseName(instigatingMouse) + 'fights and is ' +
                'killed by ' + getMouseName(opponent) + '.');
            Genetics.Visualization.removeMouse_(instigatingMouse);
            break;
        }
        break;
      case 'MATE':
        var proposingMouse = Genetics.Visualization.MICE[event['ID']];
        switch (event['RESULT']) {
          case 'NONE':
            console.log(getMouseName(proposingMouse) +
                ' elected to never mate again.');
            break;
          case 'INVALID':
            console.log(getMouseName(proposingMouse) +
                ' is confused wont mate again.');
            break;
          case 'SELF':
            console.log(getMouseName(proposingMouse) +
                ' caught trying to mate with itself.');
            break;
          case 'INCOMPATIBLE':
            var askedMouse = Genetics.Visualization.MICE[event['OPT_PARTNER']];
            console.log(getMouseName(proposingMouse) + ' mated with ' +
                getMouseName(askedMouse) + ', another ' + proposingMouse.sex + '.');
            break;
          case 'INFERTILE':
            var askedMouse = Genetics.Visualization.MICE[event['OPT_PARTNER']];
            console.log('Mating between ' + getMouseName(proposingMouse) + ' and ' +
                getMouseName(askedMouse) + ' failed because ' +
                getMouseName(askedMouse) + ' is sterile.');
            break;
          case 'MATE_EXPLODED':
            var askedMouse = Genetics.Visualization.MICE[event['OPT_PARTNER']];
            console.log(getMouseName(askedMouse) + ' exploded after ' +
                getMouseName(proposingMouse) + ' asked it out.');
            Genetics.Visualization.removeMouse_(askedMouse.id);
            break;
          case 'REJECTION':
            var askedMouse = Genetics.Visualization.MICE[event['OPT_PARTNER']];
            console.log(getMouseName(proposingMouse) + ' asked ' +
                getMouseName(askedMouse) + ' to mate, The answer is NO!');
            break;
          case 'SUCCESS':
            var askedMouse = Genetics.Visualization.MICE[event['OPT_PARTNER']];
            console.log(getMouseName(proposingMouse, true, true) + ' asked ' +
                getMouseName(askedMouse, true, true) + ' to mate, The answer ' +
                'is YES!');
            var offspring = event['OPT_OFFSPRING'];
            console.log(getMouseName(offspring, true, true) + ' was born!');
            Genetics.Visualization.addMouse_(offspring);
            break;
        }
        break;
      case 'RETIRE':
        var mouse = Genetics.Visualization.MICE[event['ID']];
        console.log(getMouseName(mouse) + ' dies after a productive life.');
        Genetics.Visualization.removeMouse_(mouse.id);
        break;
      case 'OVERPOPULATION':
        var mouse = Genetics.Visualization.MICE[event['ID']];
        console.log('Cage has gotten too cramped ' + getMouseName(mouse) +
            ' can\'t compete with the younger mice and dies.');
        Genetics.Visualization.removeMouse_(mouse.id);
        break;
      case 'EXPLODE':
        var mouse = Genetics.Visualization.MICE[event['ID']];
        var source = event['SOURCE'];
        var cause = event['CAUSE'];
        console.log(getMouseName(mouse) + ' exploded in ' + source +
            ' because ' + cause);
        Genetics.Visualization.removeMouse_(mouse.id);
        break;
      case 'SPIN':
        var mouse = Genetics.Visualization.MICE[event['ID']];
        var source = event['SOURCE'];
        console.log(getMouseName(mouse) + ' spun in circles after ' + source +
            ' was called.');
        Genetics.Visualization.removeMouse_(mouse.id);
        break;
      case 'END_GAME':
        var cause = event['CAUSE'];
        var pickFightWinner = event['PICK_FIGHT_WINNER'];
        var chooseMateWinner = event['CHOOSE_MATE_WINNER'];
        var mateAnswerWinner = event['MATE_ANSWER_WINNER'];
        console.log('Game ended because ' + cause + '. PickFight Winner: ' +
            pickFightWinner + ' chooseMate Winner: ' + chooseMateWinner +
            ' mateAnswer Winner: ' + mateAnswerWinner);
        break;
    }
    if (event['TYPE'] != 'ADD') {
      Genetics.Visualization.roundNumber++;
      Genetics.Visualization.updateChartData();
    }
  }
};

/**
 * Add a mouse to mapping and update  internal counts.
 * @param {Genetics.Mouse} mouse
 * @private
 */
Genetics.Visualization.addMouse_ = function(mouse) {
  Genetics.Visualization.MICE[mouse.id] = mouse;
  Genetics.Visualization.mouseSexes_[mouse.sex] += 1;
  Genetics.Visualization.pickFightOwners_[mouse.pickFightOwner] += 1;
  Genetics.Visualization.chooseMateOwners_[mouse.chooseMateOwner] += 1;
  Genetics.Visualization.mateAnswerOwners_[mouse.mateAnswerOwner] += 1;
};

/**
 * Remove a mouse and update internal counts.
 * @param {number} mouseId
 * @private
 */
Genetics.Visualization.removeMouse_ = function(mouseId) {
  var mouse = Genetics.Visualization.MICE[mouseId];
  Genetics.Visualization.mouseSexes_[mouse.sex] -= 1;
  Genetics.Visualization.pickFightOwners_[mouse.pickFightOwner] -= 1;
  Genetics.Visualization.chooseMateOwners_[mouse.chooseMateOwner] -= 1;
  Genetics.Visualization.mateAnswerOwners_[mouse.mateAnswerOwner] -= 1;
  delete Genetics.Visualization.MICE[mouse.id];
};


/**
 * Add a row to the charts with the current status of mice.
 * @private
 */
Genetics.Visualization.updateChartData = function() {
  Genetics.Visualization.populationChartWrapper_.getDataTable().addRow(
      [Genetics.Visualization.roundNumber,
       Genetics.Visualization.mouseSexes_[Genetics.Mouse.Sex.HERMAPHRODITE],
       Genetics.Visualization.mouseSexes_[Genetics.Mouse.Sex.MALE],
       Genetics.Visualization.mouseSexes_[Genetics.Mouse.Sex.FEMALE]]);

  var pickFightState = [Genetics.Visualization.roundNumber];
  var chooseMateState = [Genetics.Visualization.roundNumber];
  var mateAnswerState = [Genetics.Visualization.roundNumber];
  for (var i = 0; i < Genetics.Visualization.playerOrder_.length; i++) {
    var playerId = Genetics.Visualization.playerOrder_[i];
    pickFightState.push(Genetics.Visualization.pickFightOwners_[playerId]);
    chooseMateState.push(Genetics.Visualization.chooseMateOwners_[playerId]);
    mateAnswerState.push(Genetics.Visualization.mateAnswerOwners_[playerId]);
  }
  Genetics.Visualization.pickFightChartWrapper_.getDataTable()
      .addRow(pickFightState);
  Genetics.Visualization.chooseMateChartWrapper_.getDataTable()
      .addRow(chooseMateState);
  Genetics.Visualization.mateAnswerChartWrapper_.getDataTable()
      .addRow(mateAnswerState);
};

/**
 * Returns a string representation of the mouse.
 * @param {Genetics.Mouse} mouse The mouse to represent as a string.
 * @param {boolean=} opt_showStats Whether to add the mouse stats to the string
 * representation.
 * @param {boolean=} opt_showGenes Whether to add the gene owners to the string
 * representation.
 * @return {string} The string representation of the mouse.
 */
Genetics.Visualization.getMouseName = function(mouse, opt_showStats, opt_showGenes) {
  // Credit: http://blog.stevenlevithan.com/archives/javascript-roman-numeral-converter
  function romanize (value) {
    var roman = ["M","CM","D","CD","C","XC","L","XL","X","IX","V","IV","I"];
    var decimal = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
    if (value <= 0 || value >= 4000) return value;
    var romanNumeral = "";
    for (var i=0; i<roman.length; i++) {
      while (value >= decimal[i]) {
        value -= decimal[i];
        romanNumeral += roman[i];
      }
    }
    return romanNumeral;
  }
  var FEMININE_NAMES = ['Monica', 'Danielle', 'Zena', 'Brianna', 'Katie',
      'Lacy', 'Leela', 'Suzy', 'Saphira', 'Missie', 'Flo', 'Lisa'];
  var MASCULINE_NAMES = ['Neil', 'Chris', 'Charlie', 'Camden', 'Rick', 'Dean',
      'Xavier', 'Zeke', 'Han', 'Samuel', 'Wade', 'Patrick'];

  var genes = '(' + mouse.sex + ' ' +
      Genetics.Cage.PLAYERS[mouse.chooseMateOwner][0] + '/' +
      Genetics.Cage.PLAYERS[mouse.mateAnswerOwner][0] + '/' +
      Genetics.Cage.PLAYERS[mouse.pickFightOwner][0] + ')';
  var mouseStats = '[id:' + mouse.id + '/size:' + mouse.size + '/sex: ' +
      mouse.sex + ']';
  var names = (mouse.sex == Genetics.Mouse.Sex.FEMALE ||
      (mouse.sex == Genetics.Mouse.Sex.HERMAPHRODITE && 2 % mouse.id == 0)) ?
          FEMININE_NAMES : MASCULINE_NAMES;
  var name = names[mouse.id % names.length || 0];
  var ordinal = Math.floor(mouse.id/names.length) + 1;
  if(ordinal > 1) {
    name += ' ' + romanize(ordinal);
  }

  if(opt_showGenes) {
    name += ' ' + genes;
  }
  if(opt_showStats) {
    name += ' ' + mouseStats;
  }
  return name;
};