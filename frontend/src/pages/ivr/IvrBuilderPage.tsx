/**
 * IVR Builder Page
 * Visual flow builder for creating IVR call flows
 */

import React from 'react';
import ReactFlow, {
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useIvrBuilder } from './hooks';
import {
  nodeTypes,
  Header,
  NodePalette,
  PropertiesPanel,
  SettingsModal,
  IvrTestSimulator,
} from './components';

export const IvrBuilderPage: React.FC = () => {
  const {
    isNew,
    flow,
    nodes,
    edges,
    selectedNode,
    showSettings,
    showTestSimulator,
    saving,
    updateFlow,
    setShowSettings,
    setShowTestSimulator,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeClick,
    onPaneClick,
    handleDragStart,
    onDrop,
    onDragOver,
    handleDeleteNode,
    updateNodeData,
    handleSave,
    handlePublish,
    navigateBack,
  } = useIvrBuilder();

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <Header
        flow={flow}
        saving={saving}
        isNew={isNew}
        onNameChange={(name) => updateFlow({ name })}
        onSettingsClick={() => setShowSettings(true)}
        onTestClick={() => setShowTestSimulator(true)}
        onSave={handleSave}
        onPublish={handlePublish}
        onBack={navigateBack}
      />

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Node Palette */}
        <NodePalette onDragStart={handleDragStart} />

        {/* Canvas */}
        <div className="flex-1" onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
          >
            <Controls />
            <MiniMap />
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          </ReactFlow>
        </div>

        {/* Node Properties Panel */}
        {selectedNode && (
          <PropertiesPanel
            selectedNode={selectedNode}
            onDelete={handleDeleteNode}
            onUpdateData={updateNodeData}
          />
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          flow={flow}
          onUpdate={updateFlow}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Test Simulator Modal */}
      {showTestSimulator && (
        <IvrTestSimulator
          flow={flow}
          nodes={nodes}
          edges={edges}
          onClose={() => setShowTestSimulator(false)}
        />
      )}
    </div>
  );
};
