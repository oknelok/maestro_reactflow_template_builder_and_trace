import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import TraceCanvas from './components/TraceCanvas.jsx';
import LoopSwitcher from './components/LoopSwitcher.jsx';
import TraceSidePanel from './components/TraceSidePanel.jsx';
import MobileBottomSheet from './components/MobileBottomSheet.jsx';
import AutoRefreshControl from './components/AutoRefreshControl.jsx';
import useIsMobile from './hooks/useIsMobile.js';
import useAutoRefresh, { loadAutoRefreshPreference, saveAutoRefreshPreference } from './hooks/useAutoRefresh.js';
// Imported from the parent module; its edge-id format (normal-/false- prefixes) must stay in sync with ./utils/traceConverters.js.
import { tasksToNodes, tasksToEdges } from '../../../../js/src/utils/converters.js';
import { latestStepByTaskId, applyTraceToNodes, applyTraceToEdges, traversedEdgeIds, regenerationEdgeIds } from './utils/traceConverters.js';

export default function TraceApp({ settings }) {
  // Starts as the data embedded in the page; auto-refresh replaces it in place.
  const [trace, setTrace] = useState(settings || {});
  const traceRef = useRef(trace);
  const [selectedLoop, setSelectedLoop] = useState(trace.defaultLoop || '0');
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);

  const [autoRefresh, setAutoRefresh] = useState(loadAutoRefreshPreference);
  const updateAutoRefresh = changes => {
    setAutoRefresh(previous => {
      const next = { ...previous, ...changes };
      saveAutoRefreshPreference(next);
      return next;
    });
  };

  const handleRefreshedData = useCallback(data => {
    // Follow the current loop if that's what was on screen (or the chosen loop is gone);
    // otherwise keep the loop the user picked.
    setSelectedLoop(current => (
      current === traceRef.current.defaultLoop || !data.loops?.[current] ? (data.defaultLoop || '0') : current
    ));
    traceRef.current = data;
    setTrace(data);
  }, []);

  const refreshStatus = useAutoRefresh({
    // The endpoint's own response doesn't repeat its URL, so keep the one from the page.
    url: settings?.refreshUrl,
    enabled: autoRefresh.enabled,
    intervalSeconds: autoRefresh.interval,
    stopped: !!trace.processComplete,
    onData: handleRefreshedData,
  });

  const loopData = trace.loops?.[selectedLoop] || { steps: [] };
  const stepsByTaskId = useMemo(() => latestStepByTaskId(loopData.steps), [loopData.steps]);

  const baseNodes = useMemo(
    () => tasksToNodes(trace.tasks, { maestroTaskColours: trace.maestroTaskColours }),
    [trace.tasks, trace.maestroTaskColours]
  );
  const baseEdges = useMemo(() => tasksToEdges(trace.tasks), [trace.tasks]);

  const nodes = useMemo(() => applyTraceToNodes(baseNodes, stepsByTaskId), [baseNodes, stepsByTaskId]);
  const edges = useMemo(() => {
    const traversed = traversedEdgeIds(trace.tasks, stepsByTaskId);
    const regeneration = regenerationEdgeIds(trace.tasks, trace.loops, selectedLoop);
    return applyTraceToEdges(baseEdges, traversed, regeneration);
  }, [baseEdges, trace.tasks, trace.loops, stepsByTaskId, selectedLoop]);

  const sidePanel = (
    <TraceSidePanel
      steps={loopData.steps || []}
      selectedTaskId={selectedTaskId}
      processVariables={trace.processVariables || []}
      entityIdentifiers={trace.entityIdentifiers || []}
      snapshots={trace.snapshots || {}}
      traceArchiveEnabled={!!trace.traceArchiveEnabled}
    />
  );

  const handleNodeClick = (_event, node) => {
    setSelectedTaskId(node.id);
    if (isMobile) {
      setSheetOpen(true);
    }
  };

  return (
    <ReactFlowProvider>
      <div className="maestro-trace-layout">
        <div className="maestro-trace-toolbar">
          <LoopSwitcher loops={trace.loops || {}} selectedLoop={selectedLoop} onChange={setSelectedLoop} />
          {settings?.refreshUrl && (
            <AutoRefreshControl
              enabled={autoRefresh.enabled}
              interval={autoRefresh.interval}
              onToggle={enabled => updateAutoRefresh({ enabled })}
              onIntervalChange={interval => updateAutoRefresh({ interval })}
              status={refreshStatus}
              processComplete={!!trace.processComplete}
            />
          )}
          {isMobile && (
            <button
              type="button"
              className="maestro-trace-details-button"
              data-testid="mobile-details-button"
              onClick={() => setSheetOpen(true)}
            >
              Details
            </button>
          )}
        </div>
        <div className="maestro-trace-body">
          <div className="maestro-trace-canvas-wrapper">
            <TraceCanvas nodes={nodes} edges={edges} onNodeClick={handleNodeClick} />
          </div>
          {!isMobile && sidePanel}
        </div>
        {isMobile && (
          <MobileBottomSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)}>
            {sidePanel}
          </MobileBottomSheet>
        )}
      </div>
    </ReactFlowProvider>
  );
}
