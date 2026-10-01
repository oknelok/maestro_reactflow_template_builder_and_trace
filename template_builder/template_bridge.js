(function (Drupal, once, $) {
  'use strict';

  Drupal.behaviors.maestroReactFlowBuilder = {
    attach(context, settings) {
      const container = once('maestro-reactflow', '#template_canvas', context).pop();
      if (!container) return;

      function fitHeight() {
        const top = container.getBoundingClientRect().top;
        const height = Math.max(200, window.innerHeight - top - 8);
        container.style.height = height + 'px';
        container.style.setProperty('--maestro-canvas-height', height + 'px');
        // Prevent the page itself from scrolling; ReactFlow handles panning internally.
        document.documentElement.style.overflowY = 'hidden';
        document.body.style.overflowY = 'hidden';
      }
      fitHeight();
      window.addEventListener('resize', fitHeight);

      window.MaestroReactFlowApp.mount(container, settings);
    },
  };

  $('#close-task-menu').on('click', function () {
    $('#maestro-task-menu').css('display', 'none');
    $('[name="task_clicked"]').val('');
  });

  Drupal.maestroRemoveTaskMenuSelect = function () {
    if (window.confirm('Remove this task?')) {
      $('#edit-remove-task-complete').trigger('mousedown');
    }
  };

  Drupal.AjaxCommands = Drupal.AjaxCommands || {};
  Drupal.AjaxCommands.prototype = Drupal.AjaxCommands.prototype || {};

  Drupal.AjaxCommands.prototype.addNewTask = function (ajax, response) {
    if (!window.MaestroReact) return;
    window.MaestroReact.addTask({
      id: response.id,
      type: response.type,
      taskname: response.label,
      uilabel: response.uilabel,
      top: 15,
      left: 15,
      to: [],
      falsebranch: [],
      capabilities: response.capabilities,
      workflow_status_stage_number: '',
      workflow_status_stage_message: '',
    });
  };

  Drupal.AjaxCommands.prototype.maestroRemoveTask = function (ajax, response) {
    if (!window.MaestroReact) return;
    window.MaestroReact.removeTask(response.task);
  };

  Drupal.AjaxCommands.prototype.maestroDrawLineTo = function (ajax, response) {
    if (!window.MaestroReact) return;
    window.MaestroReact.setPendingConnection({ from: response.taskid, type: 'normal' });
  };

  Drupal.AjaxCommands.prototype.maestroDrawFalseLineTo = function (ajax, response) {
    if (!window.MaestroReact) return;
    window.MaestroReact.setPendingConnection({ from: response.taskid, type: 'false' });
  };

  Drupal.AjaxCommands.prototype.maestroUpdateMetaData = function (ajax, response) {
    if (!window.MaestroReact) return;
    window.MaestroReact.updateMetadata(response);
  };

  Drupal.AjaxCommands.prototype.maestroRemoveTaskLines = function (ajax, response) {
    if (!window.MaestroReact) return;
    window.MaestroReact.removeLines(response.task);
  };

  Drupal.AjaxCommands.prototype.maestroCloseTaskMenu = function () {
    $('#maestro-task-menu').css('display', 'none');
  };

  Drupal.AjaxCommands.prototype.alterCanvas = function (ajax, response) {
    $('#template_canvas').width(response.width).height(response.height);
  };

  Drupal.AjaxCommands.prototype.signalValidationRequired = function () {
    $('#maestro-template-validation')
      .removeClass('fade-out')
      .css({ display: 'block', width: 'auto', height: 'auto' });
    setTimeout(() => $('#maestro-template-validation').addClass('fade-out'), 500);
  };

  Drupal.AjaxCommands.prototype.turnOffValidationRequired = function () {
    $('#maestro-template-validation').css('display', 'none');
  };

  Drupal.AjaxCommands.prototype.maestroEditTask = function () {
    $('#edit-edit-task-complete').trigger('click');
  };

  Drupal.AjaxCommands.prototype.maestroShowSavedMessage = function () {
    $('#drupal-modal').animate({ scrollTop: 0 }, 'fast');
    $('#save-task-notificaiton').css('display', 'block').fadeOut(3000);
  };

  Drupal.AjaxCommands.prototype.maestroSignalError = function (ajax, response) {
    $('#maestro-template-error').html(response.message).show();
    setTimeout(() => $('#maestro-template-error').fadeOut(2000), 3000);
  };

  Drupal.AjaxCommands.prototype.maestroNoOp = function () {};

})(Drupal, once, jQuery);
