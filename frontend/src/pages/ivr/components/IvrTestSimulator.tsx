/**
 * IVR Test Simulator
 * Simulates a call through the IVR flow for testing DTMF paths
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Node, Edge } from 'reactflow';
import {
  Phone,
  PhoneOff,
  Volume2,
  Hash,
  RotateCcw,
  X,
  ChevronRight,
} from 'lucide-react';
import { FlowState, MenuOption } from '../ivr-builder.types';

interface IvrTestSimulatorProps {
  flow: FlowState;
  nodes: Node[];
  edges: Edge[];
  onClose: () => void;
  onHighlightNode?: (nodeId: string | null) => void;
}

interface CallState {
  status: 'idle' | 'connecting' | 'active' | 'ended';
  currentNodeId: string | null;
  history: { nodeId: string; action: string; timestamp: Date }[];
  currentMessage: string;
  isPlaying: boolean;
}

export const IvrTestSimulator: React.FC<IvrTestSimulatorProps> = ({
  flow,
  nodes,
  edges,
  onClose,
  onHighlightNode,
}) => {
  const [callState, setCallState] = useState<CallState>({
    status: 'idle',
    currentNodeId: null,
    history: [],
    currentMessage: '',
    isPlaying: false,
  });

  const [dtmfInput, setDtmfInput] = useState('');

  // Find the start node (first node or explicitly marked start)
  const findStartNode = useCallback((): Node | null => {
    // Look for a 'start' type node or 'play' node with no incoming edges
    const nodeIdsWithIncoming = new Set(edges.map(e => e.target));
    const startNode = nodes.find(n => !nodeIdsWithIncoming.has(n.id));
    return startNode || nodes[0] || null;
  }, [nodes, edges]);

  // Find next node based on DTMF input or default path
  const findNextNode = useCallback((currentNodeId: string, digit?: string): Node | null => {
    const currentNode = nodes.find(n => n.id === currentNodeId);
    if (!currentNode) return null;

    // For menu nodes, find the edge matching the digit
    if (currentNode.type === 'menu' && digit) {
      const options = currentNode.data.options || [];
      const matchingOption = options.find((opt: MenuOption) => opt.digit === digit);
      if (matchingOption) {
        // Find edge that goes to the option's target
        const outgoingEdges = edges.filter(e => e.source === currentNodeId);
        // The edge label or sourceHandle should match the digit
        const matchingEdge = outgoingEdges.find(
          e => e.sourceHandle === digit || e.label === digit
        ) || outgoingEdges[parseInt(digit) - 1];
        if (matchingEdge) {
          return nodes.find(n => n.id === matchingEdge.target) || null;
        }
      }
    }

    // Default: follow first outgoing edge
    const nextEdge = edges.find(e => e.source === currentNodeId);
    if (nextEdge) {
      return nodes.find(n => n.id === nextEdge.target) || null;
    }

    return null;
  }, [nodes, edges]);

  // Get message for current node
  const getNodeMessage = useCallback((node: Node): string => {
    switch (node.type) {
      case 'play':
        return node.data.ttsText || 'Playing audio...';
      case 'menu':
        const options = (node.data.options || []) as MenuOption[];
        const optionText = options.map(o => `Press ${o.digit} for ${o.label}`).join('. ');
        return `${node.data.label}. ${optionText}`;
      case 'gather':
        return `Please enter ${node.data.numDigits || 'your'} digits`;
      case 'transfer':
        return `Transferring to ${node.data.number || 'operator'}...`;
      case 'queue':
        return `Placing you in queue: ${node.data.queueName || 'General'}. Please hold.`;
      case 'voicemail':
        return 'Please leave a message after the beep.';
      case 'webhook':
        return 'Processing your request...';
      case 'end':
        return node.data.message || 'Thank you for calling. Goodbye.';
      default:
        return node.data.label || 'Processing...';
    }
  }, []);

  // Start call simulation
  const startCall = useCallback(() => {
    const startNode = findStartNode();
    if (!startNode) {
      setCallState(prev => ({
        ...prev,
        status: 'ended',
        currentMessage: 'Error: No start node found',
      }));
      return;
    }

    setCallState({
      status: 'connecting',
      currentNodeId: null,
      history: [],
      currentMessage: 'Connecting...',
      isPlaying: false,
    });

    // Simulate connection delay
    setTimeout(() => {
      setCallState(prev => ({
        ...prev,
        status: 'active',
        currentNodeId: startNode.id,
        currentMessage: flow.welcomeMessage || getNodeMessage(startNode),
        history: [{ nodeId: startNode.id, action: 'Call started', timestamp: new Date() }],
        isPlaying: true,
      }));
      onHighlightNode?.(startNode.id);
    }, 1000);
  }, [findStartNode, flow.welcomeMessage, getNodeMessage, onHighlightNode]);

  // Handle DTMF input
  const handleDtmfPress = useCallback((digit: string) => {
    if (callState.status !== 'active' || !callState.currentNodeId) return;

    setDtmfInput(prev => prev + digit);

    const currentNode = nodes.find(n => n.id === callState.currentNodeId);
    if (!currentNode) return;

    // For menu nodes, process immediately
    if (currentNode.type === 'menu') {
      const nextNode = findNextNode(callState.currentNodeId, digit);

      setCallState(prev => ({
        ...prev,
        history: [
          ...prev.history,
          { nodeId: callState.currentNodeId!, action: `Pressed ${digit}`, timestamp: new Date() },
        ],
      }));

      if (nextNode) {
        setTimeout(() => {
          setCallState(prev => ({
            ...prev,
            currentNodeId: nextNode.id,
            currentMessage: getNodeMessage(nextNode),
            history: [
              ...prev.history,
              { nodeId: nextNode.id, action: `Navigated to ${nextNode.data.label}`, timestamp: new Date() },
            ],
          }));
          onHighlightNode?.(nextNode.id);
          setDtmfInput('');

          // Auto-end if we hit an end node
          if (nextNode.type === 'end') {
            setTimeout(() => {
              setCallState(prev => ({ ...prev, status: 'ended' }));
              onHighlightNode?.(null);
            }, 3000);
          }
        }, 500);
      } else {
        setCallState(prev => ({
          ...prev,
          currentMessage: 'Invalid option. ' + getNodeMessage(currentNode),
        }));
      }
    }
  }, [callState, nodes, findNextNode, getNodeMessage, onHighlightNode]);

  // End call
  const endCall = useCallback(() => {
    setCallState(prev => ({
      ...prev,
      status: 'ended',
      currentMessage: 'Call ended',
      history: [...prev.history, { nodeId: '', action: 'Call ended by user', timestamp: new Date() }],
    }));
    onHighlightNode?.(null);
  }, [onHighlightNode]);

  // Reset simulator
  const resetSimulator = useCallback(() => {
    setCallState({
      status: 'idle',
      currentNodeId: null,
      history: [],
      currentMessage: '',
      isPlaying: false,
    });
    setDtmfInput('');
    onHighlightNode?.(null);
  }, [onHighlightNode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      onHighlightNode?.(null);
    };
  }, [onHighlightNode]);

  const dtmfButtons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Phone size={24} />
              <div>
                <h2 className="font-semibold">Test Call Simulator</h2>
                <p className="text-sm text-blue-200">{flow.name || 'Untitled Flow'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Call Status Display */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                callState.status === 'idle' ? 'bg-gray-400' :
                callState.status === 'connecting' ? 'bg-yellow-400 animate-pulse' :
                callState.status === 'active' ? 'bg-green-500' :
                'bg-red-500'
              }`} />
              <span className="text-sm font-medium capitalize">{callState.status}</span>
            </div>
            {callState.currentNodeId && (
              <span className="text-xs text-gray-500">
                Current: {nodes.find(n => n.id === callState.currentNodeId)?.data.label}
              </span>
            )}
          </div>

          {/* Current Message */}
          <div className="bg-white rounded-lg p-4 border min-h-[80px]">
            <div className="flex items-start gap-3">
              {callState.status === 'active' && (
                <Volume2 className="text-blue-500 mt-0.5 flex-shrink-0" size={20} />
              )}
              <p className="text-gray-700">
                {callState.currentMessage || 'Press "Start Call" to begin simulation'}
              </p>
            </div>
          </div>

          {/* DTMF Input Display */}
          {dtmfInput && (
            <div className="mt-2 flex items-center gap-2">
              <Hash size={16} className="text-gray-400" />
              <span className="font-mono text-lg tracking-wider">{dtmfInput}</span>
            </div>
          )}
        </div>

        {/* DTMF Keypad */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
            {dtmfButtons.map((digit) => (
              <button
                key={digit}
                onClick={() => handleDtmfPress(digit)}
                disabled={callState.status !== 'active'}
                className={`
                  h-14 rounded-lg font-semibold text-xl transition-all
                  ${callState.status === 'active'
                    ? 'bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-800'
                    : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                  }
                `}
              >
                {digit}
              </button>
            ))}
          </div>
        </div>

        {/* Call Controls */}
        <div className="px-6 py-4 bg-gray-50 flex justify-center gap-4">
          {callState.status === 'idle' && (
            <button
              onClick={startCall}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-full font-medium transition-colors"
            >
              <Phone size={20} />
              Start Call
            </button>
          )}

          {(callState.status === 'connecting' || callState.status === 'active') && (
            <button
              onClick={endCall}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-medium transition-colors"
            >
              <PhoneOff size={20} />
              End Call
            </button>
          )}

          {callState.status === 'ended' && (
            <button
              onClick={resetSimulator}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium transition-colors"
            >
              <RotateCcw size={20} />
              New Test
            </button>
          )}
        </div>

        {/* Call History */}
        {callState.history.length > 0 && (
          <div className="px-6 py-4 border-t max-h-48 overflow-y-auto">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Call Path</h4>
            <div className="space-y-1">
              {callState.history.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                  <ChevronRight size={14} className="text-gray-400" />
                  <span>{entry.action}</span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {entry.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IvrTestSimulator;
