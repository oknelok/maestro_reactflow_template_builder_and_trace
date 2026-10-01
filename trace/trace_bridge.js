(function (Drupal, once) {
  'use strict';

  Drupal.behaviors.maestroTraceViewer = {
    attach(context, settings) {
      const container = once('maestro-trace-viewer', '#maestro_trace_viewer_canvas', context).pop();
      if (!container) return;
      window.MaestroTraceViewerApp.mount(container, settings.maestroTrace);
    },
  };

})(Drupal, once);
