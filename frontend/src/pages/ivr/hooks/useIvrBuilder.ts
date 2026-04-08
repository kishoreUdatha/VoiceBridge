/**
 * IVR Builder Hook
 * Manages state and operations for the IVR flow builder
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Node,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { FlowState } from '../ivr-builder.types';
import { INITIAL_FLOW_STATE } from '../ivr-builder.constants';

export function useIvrBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [flow, setFlow] = useState<FlowState>(INITIAL_FLOW_STATE);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showTestSimulator, setShowTestSimulator] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isNew && id) {
      fetchFlow();
    }
  }, [id, isNew]);

  const fetchFlow = async () => {
    try {
      const response = await api.get(`/ivr/flows/${id}`);
      const data = response.data.data;
      setFlow({
        id: data.id,
        name: data.name,
        description: data.description || '',
        welcomeMessage: data.welcomeMessage || '',
        timeoutSeconds: data.timeoutSeconds,
        maxRetries: data.maxRetries,
        isActive: data.isActive,
      });
      setNodes(data.nodes || []);
      setEdges(data.edges || []);
    } catch {
      toast.error('Failed to load IVR flow');
      navigate('/ivr');
    }
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = {
        x: event.clientX - 250,
        y: event.clientY - 100,
      };

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {
          label: `New ${type}`,
          options: type === 'menu' ? [{ digit: '1', label: 'Option 1' }] : undefined
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleSave = async () => {
    if (!flow.name) {
      toast.error('Please enter a flow name');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: flow.name,
        description: flow.description,
        welcomeMessage: flow.welcomeMessage,
        timeoutSeconds: flow.timeoutSeconds,
        maxRetries: flow.maxRetries,
        nodes,
        edges,
      };

      if (isNew) {
        const response = await api.post('/ivr/flows', payload);
        toast.success('IVR flow created');
        navigate(`/ivr/${response.data.data.id}`);
      } else {
        await api.put(`/ivr/flows/${id}`, payload);
        toast.success('IVR flow saved');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to save flow');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (isNew) {
      toast.error('Save the flow first before publishing');
      return;
    }

    try {
      await api.post(`/ivr/flows/${id}/publish`);
      setFlow(prev => ({ ...prev, isActive: true }));
      toast.success('IVR flow published');
    } catch {
      toast.error('Failed to publish flow');
    }
  };

  const handleDeleteNode = () => {
    if (!selectedNode) return;
    setNodes(nds => nds.filter(n => n.id !== selectedNode.id));
    setEdges(eds => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  };

  const updateNodeData = (key: string, value: unknown) => {
    if (!selectedNode) return;
    setNodes(nds =>
      nds.map(n =>
        n.id === selectedNode.id
          ? { ...n, data: { ...n.data, [key]: value } }
          : n
      )
    );
    setSelectedNode(prev => prev ? { ...prev, data: { ...prev.data, [key]: value } } : null);
  };

  const updateFlow = (updates: Partial<FlowState>) => {
    setFlow(prev => ({ ...prev, ...updates }));
  };

  const navigateBack = () => navigate('/ivr');

  return {
    // State
    id,
    isNew,
    flow,
    nodes,
    edges,
    selectedNode,
    showSettings,
    showTestSimulator,
    saving,
    // Flow state setters
    updateFlow,
    setShowSettings,
    setShowTestSimulator,
    // Node/Edge handlers
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeClick,
    onPaneClick,
    // Drag & Drop
    handleDragStart,
    onDrop,
    onDragOver,
    // Node operations
    handleDeleteNode,
    updateNodeData,
    // Actions
    handleSave,
    handlePublish,
    navigateBack,
  };
}
