/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var App = require('app');
var uiEffects = require('utils/ui_effects');

App.HostComponentView = Em.View.extend({

  templateName: require('templates/main/host/details/host_component'),

  /**
   * @type {App.HostComponent}
   */
  content: null,
  excludedMasterCommands: ['DECOMMISSION', 'RECOMMISSION'],
  /**
   * @type {App.HostComponent}
   */
  hostComponent: function () {
    var hostComponent = null;
    var serviceComponent = this.get('content');
    var host = App.router.get('mainHostDetailsController.content');
    if (host) {
      hostComponent = host.get('hostComponents').findProperty('componentName', serviceComponent.get('componentName'));
    }
    return hostComponent;
  }.property('content', 'App.router.mainHostDetailsController.content'),
  /**
   * @type {String}
   */
  workStatus: Em.computed.firstNotBlank('hostComponent.workStatus', 'content.workStatus'),

  /**
   * Return host component text status
   * @type {String}
   */
  componentTextStatus: Em.computed.firstNotBlank('hostComponent.componentTextStatus', 'content.componentTextStatus'),

  /**
   * CSS-class for host component status
   * @type {String}
   */
  statusClass: function () {
    //Class when install failed
    if (this.get('workStatus') === App.HostComponentStatus.install_failed) {
      return 'health-status-color-red icon-cog';
    }

    //Class when installing
    if (this.get('workStatus') === App.HostComponentStatus.installing) {
      return 'health-status-color-blue icon-cog';
    }

    //For all other cases
    return 'health-status-' + App.HostComponentStatus.getKeyName(this.get('workStatus'));

  }.property('workStatus'),

  /**
   * CSS-icon-class for host component status
   * @type {String}
   */
  statusIconClass: function () {
    return Em.getWithDefault({
      'health-status-started': App.healthIconClassGreen,
      'health-status-starting': App.healthIconClassGreen,
      'health-status-installed': App.healthIconClassRed,
      'health-status-stopping': App.healthIconClassRed,
      'health-status-unknown': App.healthIconClassYellow,
      'health-status-DEAD-ORANGE': App.healthIconClassOrange
    }, this.get('statusClass'), '');
  }.property('statusClass'),

  /**
   * CSS-class for disabling drop-down menu with list of host component actions
   * Disabled if host's <code>healthClass</code> is health-status-DEAD-YELLOW (lost heartbeat)
   * Disabled if component's action list is empty
   * @type {String}
   */
  disabled: function () {
    return ( (this.get('parentView.content.healthClass') === "health-status-DEAD-YELLOW") || (this.get('noActionAvailable') === 'hidden' && this.get('isRestartComponentDisabled'))) ? 'disabled' : '';
  }.property('parentView.content.healthClass', 'noActionAvailable', 'isRestartComponentDisabled'),

  /**
   * For Upgrade failed state
   * @type {bool}
   */
  isUpgradeFailed: Em.computed.equal('workStatus', App.HostComponentStatus.upgrade_failed),

  /**
   * For Install failed state
   * @type {bool}
   */
  isInstallFailed: Em.computed.equal('workStatus', App.HostComponentStatus.install_failed),

  /**
   * For Started and Starting states
   * @type {bool}
   */
  isStart: Em.computed.existsIn('workStatus', [App.HostComponentStatus.started, App.HostComponentStatus.starting]),

  /**
   * For Installed state
   * @type {bool}
   */
  isStop: Em.computed.equal('workStatus', App.HostComponentStatus.stopped),

  /**
   * For Installing state
   * @type {bool}
   */
  isInstalling: Em.computed.equal('workStatus', App.HostComponentStatus.installing),

  /**
   * For Init state
   * @type {bool}
   */
  isInit: Em.computed.equal('workStatus', App.HostComponentStatus.init),

  /**
   * For Stopping or Starting states
   * @type {bool}
   */
  isInProgress: Em.computed.existsIn('workStatus', [App.HostComponentStatus.stopping, App.HostComponentStatus.starting]),

  withoutActions: Em.computed.existsIn('workStatus', [App.HostComponentStatus.starting, App.HostComponentStatus.stopping, App.HostComponentStatus.unknown, App.HostComponentStatus.disabled]),

  /**
   * No action available while component is starting/stopping/unknown
   * @type {String}
   */
  noActionAvailable: Em.computed.ifThenElse('withoutActions', 'hidden', ''),

  /**
   * For OFF <code>passiveState</code> of host component
   * @type {bool}
   */
  isActive: Em.computed.equal('content.passiveState', 'OFF'),

  /**
   *  Tooltip message for switch maintenance mode option
   *  @type {Strting}
   */
  maintenanceTooltip: function () {
    switch (this.get('content.passiveState')) {
      case 'IMPLIED_FROM_SERVICE':
        return Em.I18n.t('passiveState.disabled.impliedFromHighLevel').format(this.get('content.displayName'), this.get('content.service.serviceName'));
      case 'IMPLIED_FROM_HOST':
        return Em.I18n.t('passiveState.disabled.impliedFromHighLevel').format(this.get('content.displayName'), this.get('content.host.hostName'));
      case 'IMPLIED_FROM_SERVICE_AND_HOST':
        return Em.I18n.t('passiveState.disabled.impliedFromServiceAndHost').format(this.get('content.displayName'), this.get('content.service.serviceName'), this.get('content.host.hostName'));
      default:
        return '';
    }
  }.property('content.passiveState'),

  /**
   * Shows whether we need to show Delete button
   * @type {bool}
   */
  isDeletableComponent: function () {
    return App.get('components.deletable').contains(this.get('content.componentName'));
  }.property('content'),

  /**
   * Host component with some <code>workStatus</code> can't be moved (so, disable such action in the dropdown list)
   * @type {boolean}
   */
  isMoveComponentDisabled: function () {
    return App.get('allHostNames').length === App.HostComponent.find().filterProperty('componentName', this.get('content.componentName')).mapProperty('hostName').length;
  }.property('content.componentName', 'App.allHostNames'),

  /**
   * Host component with some <code>workStatus</code> can't be deleted (so, disable such action in the dropdown list)
   * @type {bool}
   */
  isDeleteComponentDisabled: function () {
    var stackComponentCount = App.StackServiceComponent.find(this.get('hostComponent.componentName')).get('minToInstall');
    var installedCount = App.HostComponent.getCount(this.get('hostComponent.componentName'), 'totalCount');
    return (installedCount <= stackComponentCount)
      || ![App.HostComponentStatus.stopped, App.HostComponentStatus.unknown, App.HostComponentStatus.install_failed, App.HostComponentStatus.upgrade_failed, App.HostComponentStatus.init].contains(this.get('workStatus'));
  }.property('workStatus'),

  /**
   * Gets number of current running components that are applied to the cluster
   * @returns {Number}
   */
  runningComponentCounter: function () {
    return App.HostComponent.find().filter(function (component) {
      return (component.get('componentName') === this.get('content.componentName') && [App.HostComponentStatus.started, App.HostComponentStatus.starting].contains(component.get('workStatus')))
    }, this).length;
  },

  /**
   * Check if component may be reassinged to another host
   * @type {bool}
   */
  isReassignable: function () {
    return App.get('components.reassignable').contains(this.get('content.componentName')) && App.router.get('mainHostController.hostsCountMap')['TOTAL'] > 1;
  }.property('content.componentName'),

  /**
   * Check if component is restartable
   * @type {bool}
   */
  isRestartableComponent: function() {
    return App.get('components.restartable').contains(this.get('content.componentName'));
  }.property('content'),

  /**
   * Host component with some <code>workStatus</code> can't be restarted (so, disable such action in the dropdown list)
   * @type {bool}
   */
  isRestartComponentDisabled: Em.computed.notEqual('workStatus', App.HostComponentStatus.started),

  /**
   * Check if component configs can be refreshed
   * @type {bool}
   */
  isRefreshConfigsAllowed: function() {
    return App.get('components.refreshConfigsAllowed').contains(this.get('content.componentName'));
  }.property('content'),

  willInsertElement: function() {
    //make link to view instance to get decommission state
    this.set('content.view', this);
  },

  didInsertElement: function () {
    App.tooltip($('[rel=componentHealthTooltip]'));
    App.tooltip($('[rel=passiveTooltip]'));
    if (this.get('isInProgress')) {
      this.doBlinking();
    }
  },

  /**
   * Do blinking for 1 minute
   */
  doBlinking: function () {
    var workStatus = this.get('workStatus');
    var self = this;
    var pulsate = [ App.HostComponentStatus.starting, App.HostComponentStatus.stopping, App.HostComponentStatus.installing].contains(workStatus);
    if (pulsate && !self.get('isBlinking')) {
      self.set('isBlinking', true);
      uiEffects.pulsate(self.$('.components-health'), 1000, function () {
        self.set('isBlinking', false);
        self.doBlinking();
      });
    }
  },

  /**
   * Start blinking when host component is starting/stopping
   */
  startBlinking: function () {
    this.$('.components-health').stop(true, true);
    this.$('.components-health').css({opacity: 1.0});
    this.doBlinking();
  }.observes('workStatus'),

  /**
   * Get custom commands for slave components
   */
  customCommands: function() {
    var customCommands;
    var hostComponent = this.get('content');
    var component = App.StackServiceComponent.find(hostComponent.get('componentName'));

    customCommands = this.getCustomCommands(component, hostComponent, component.get('isSlave'));

    return customCommands;
  }.property('content', 'workStatus'),

  /**
   * Get a list of custom commands
   *
   * @param component
   * @param hostComponent
   * @param isSlave
   * @returns {Array}
   */
  getCustomCommands: function (component, hostComponent, isSlave) {
    isSlave = isSlave || false;

    if (!component || !hostComponent) {
      return [];
    }

    var self = this;
    var commands = component.get('customCommands');
    var customCommands = [];

    commands.forEach(function(command) {
      if (!isSlave && !self.meetsCustomCommandReq(component, command)) {
        return;
      }

      var commandMap = App.HostComponentActionMap.getMap(self)[command];
      // push command if either there is no map or map is not instructing to hide command from this view
      if (!commandMap || !commandMap.hideFromComponentView) {
        customCommands.push({
          label: self.getCustomCommandLabel(command),
          service: component.get('serviceName'),
          hosts: hostComponent.get('hostName'),
          context: (!!commandMap && !!commandMap.context) ? commandMap.context : null,
          component: component.get('componentName'),
          command: command,
          disabled: !!commandMap ? !!commandMap.disabled : false
        });
      }
    });

    return customCommands;
  },

  /**
   * Get the Label of the custom command
   *
   * @param command
   * @returns {String}
   */
  getCustomCommandLabel: function (command) {
    if (command in App.HostComponentActionMap.getMap(this) && App.HostComponentActionMap.getMap(this)[command].label)
      return App.HostComponentActionMap.getMap(this)[command].label;
    
    return Em.I18n.t('services.service.actions.run.executeCustomCommand.menu').format(App.format.normalizeNameBySeparators(command, ["_", "-", " "]));
  },

  /**
   * The custom command meets the requirements to be active on master
   *
   * @param component
   * @param command
   *
   * @return {Boolean}
   */
  meetsCustomCommandReq: function (component, command) {
    var excludedMasterCommands = this.get('excludedMasterCommands');

    if (excludedMasterCommands.indexOf(command) >= 0) {
      return false;
    }

    if (component.get('cardinality') !== '1') {
      if (!this.get('isStart')) {
        if (App.HostComponent.getCount(this.get('hostComponent.componentName'), 'totalCount') > 1) {
          if (this.runningComponentCounter()) {
            return false;
          }
        } else {
          return false;
        }
      }
    }

    return true;
  }

});
