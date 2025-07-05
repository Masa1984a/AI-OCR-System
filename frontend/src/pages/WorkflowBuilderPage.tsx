import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  TextField,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  AccountTree,
  Save,
  Add,
  Edit,
  Preview,
  AutoFixHigh,
} from '@mui/icons-material';
import { WorkflowDefinition, WorkflowBuilderState, WorkflowGraphNode, WorkflowGraphEdge } from '../types/workflow-builder.types';
import WorkflowCanvas from '../components/workflow/WorkflowCanvas';
import NodePalette from '../components/workflow/NodePalette';
import PropertyPanel from '../components/workflow/PropertyPanel';
import ValidationPanel from '../components/workflow/ValidationPanel';
import { workflowApi } from '../services/api';
import { validateWorkflow, ValidationResult } from '../utils/workflow-validation';

interface WorkflowSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (workflow: WorkflowDefinition | null) => void;
  workflows: WorkflowDefinition[];
}

const WorkflowSelectionDialog: React.FC<WorkflowSelectionDialogProps> = ({
  open,
  onClose,
  onSelect,
  workflows,
}) => {
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);

  const handleCreateNew = () => {
    if (!newWorkflowName.trim()) return;
    
    const newWorkflow: WorkflowDefinition = {
      id: `new-${Date.now()}`,
      name: newWorkflowName,
      description: '',
      version: '1.0',
      isActive: true,
      graphJson: {
        nodes: [],
        edges: [],
      },
    };
    
    onSelect(newWorkflow);
    setNewWorkflowName('');
    setShowNewForm(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        ワークフロー選択
        <Button
          startIcon={<Add />}
          onClick={() => setShowNewForm(!showNewForm)}
          sx={{ float: 'right' }}
        >
          新規作成
        </Button>
      </DialogTitle>
      <DialogContent>
        {showNewForm && (
          <Box sx={{ mb: 3, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
            <TextField
              label="ワークフロー名"
              value={newWorkflowName}
              onChange={(e) => setNewWorkflowName(e.target.value)}
              fullWidth
              variant="outlined"
              size="small"
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                onClick={handleCreateNew}
                disabled={!newWorkflowName.trim()}
              >
                作成
              </Button>
              <Button onClick={() => setShowNewForm(false)}>
                キャンセル
              </Button>
            </Box>
          </Box>
        )}
        
        <List>
          {workflows.map((workflow) => (
            <ListItem key={workflow.id} disablePadding>
              <ListItemButton onClick={() => { onSelect(workflow); onClose(); }}>
                <ListItemText
                  primary={workflow.name}
                  secondary={`バージョン: ${workflow.version} | ${workflow.isActive ? 'アクティブ' : '非アクティブ'}`}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
      </DialogActions>
    </Dialog>
  );
};

const WorkflowBuilderPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [builderState, setBuilderState] = useState<WorkflowBuilderState>({
    selectedWorkflow: null,
    isEditMode: true,
    selectedNode: null,
    selectedEdge: null,
    isDirty: false,
  });
  const [pageError, setPageError] = useState<string | null>(null);

  // Debug builderState changes
  useEffect(() => {
    // console.log('builderState updated:', builderState);
    // console.log('selectedNode:', builderState.selectedNode);
    if (builderState.selectedWorkflow && builderState.selectedWorkflow.graphJson) {
      const { nodes, edges } = builderState.selectedWorkflow.graphJson;
      const result = validateWorkflow(nodes || [], edges || []);
      setValidationResult(result);
    }
  }, [builderState]);

  const [workflowDialogOpen, setWorkflowDialogOpen] = useState(false);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // Load workflows from API
  const loadWorkflows = useCallback(async () => {
    try {
      setIsLoading(true);
      setPageError(null);
      const response = await workflowApi.getDefinitions();
      console.log('API response:', response.data);
      const workflowsData = response.data.map((workflow: any) => ({
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        version: workflow.version,
        isActive: workflow.isActive,
        graphJson: workflow.graphJson || { nodes: [], edges: [] },
      }));
      console.log('Processed workflows:', workflowsData);
      if (workflowsData.length > 0) {
        console.log('First workflow graphJson:', workflowsData[0].graphJson);
      }
      setWorkflows(workflowsData);
    } catch (error: any) {
      console.error('Failed to load workflows:', error);
      console.error('Error details:', error.response?.status, error.response?.data);
      setPageError(`ワークフローの読み込みに失敗しました: ${error.message}`);
      console.log('Using fallback mock data');
      // Use mock data as fallback
      setWorkflows([
        {
          id: '1',
          name: '3段階承認フロー',
          description: 'draft→review→approval→completed',
          version: '1.0',
          isActive: true,
          graphJson: {
            nodes: [
              {
                id: 'start-1',
                type: 'start',
                position: { x: 50, y: 100 },
                data: { stateKey: 'start', label: '開始', isInitial: true }
              },
              {
                id: 'draft-1',
                type: 'state',
                position: { x: 200, y: 100 },
                data: { stateKey: 'draft', label: '下書き', slaHours: 24 }
              },
              {
                id: 'review-1',
                type: 'state',
                position: { x: 350, y: 100 },
                data: { stateKey: 'review', label: 'レビュー', slaHours: 48 }
              },
              {
                id: 'approval-1',
                type: 'state',
                position: { x: 500, y: 100 },
                data: { stateKey: 'approval', label: '承認', slaHours: 72 }
              },
              {
                id: 'completed-1',
                type: 'end',
                position: { x: 650, y: 100 },
                data: { stateKey: 'completed', label: '完了', isFinal: true }
              }
            ],
            edges: [
              {
                id: 'e1',
                source: 'start-1',
                target: 'draft-1',
                data: { actionKey: 'start', actionLabel: '開始', requiresComment: false, autoAdvance: true }
              },
              {
                id: 'e2',
                source: 'draft-1',
                target: 'review-1',
                data: { actionKey: 'submit', actionLabel: 'レビュー依頼', requiresComment: false, autoAdvance: false }
              },
              {
                id: 'e3',
                source: 'review-1',
                target: 'approval-1',
                data: { actionKey: 'approve_review', actionLabel: 'レビュー承認', requiresComment: false, autoAdvance: false }
              },
              {
                id: 'e4',
                source: 'approval-1',
                target: 'completed-1',
                data: { actionKey: 'approve_final', actionLabel: '最終承認', requiresComment: false, autoAdvance: false }
              }
            ]
          },
        },
        {
          id: '2',
          name: 'シンプル承認フロー',
          description: 'draft→approval→completed',
          version: '1.0',
          isActive: true,
          graphJson: {
            nodes: [
              {
                id: 'start-2',
                type: 'start',
                position: { x: 100, y: 150 },
                data: { stateKey: 'start', label: '開始', isInitial: true }
              },
              {
                id: 'draft-2',
                type: 'state',
                position: { x: 300, y: 150 },
                data: { stateKey: 'draft', label: '下書き', slaHours: 24 }
              },
              {
                id: 'approval-2',
                type: 'state',
                position: { x: 500, y: 150 },
                data: { stateKey: 'approval', label: '承認', slaHours: 48 }
              },
              {
                id: 'completed-2',
                type: 'end',
                position: { x: 700, y: 150 },
                data: { stateKey: 'completed', label: '完了', isFinal: true }
              }
            ],
            edges: [
              {
                id: 'e1',
                source: 'start-2',
                target: 'draft-2',
                data: { actionKey: 'start', actionLabel: '開始', requiresComment: false, autoAdvance: true }
              },
              {
                id: 'e2',
                source: 'draft-2',
                target: 'approval-2',
                data: { actionKey: 'submit', actionLabel: '承認依頼', requiresComment: false, autoAdvance: false }
              },
              {
                id: 'e3',
                source: 'approval-2',
                target: 'completed-2',
                data: { actionKey: 'approve', actionLabel: '承認', requiresComment: false, autoAdvance: false }
              }
            ]
          },
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load workflows on mount
  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  const handleWorkflowSelect = useCallback((workflow: WorkflowDefinition | null) => {
    console.log('handleWorkflowSelect called with:', workflow);
    console.log('Selected workflow graphJson:', workflow?.graphJson);
    // Ensure proper data structure for selected workflow
    if (workflow) {
      const normalizedWorkflow = {
        ...workflow,
        graphJson: {
          nodes: workflow.graphJson?.nodes || [],
          edges: workflow.graphJson?.edges || [],
        }
      };

      // Ensure each node has proper data structure
      normalizedWorkflow.graphJson.nodes = normalizedWorkflow.graphJson.nodes.map(node => ({
        ...node,
        data: {
          stateKey: node.data?.stateKey || '',
          label: node.data?.label || '',
          isInitial: node.data?.isInitial || false,
          isFinal: node.data?.isFinal || false,
          slaHours: node.data?.slaHours || undefined,
          description: node.data?.description || '',
          ...node.data,
        }
      }));

      // Ensure each edge has proper data structure
      normalizedWorkflow.graphJson.edges = normalizedWorkflow.graphJson.edges.map(edge => ({
        ...edge,
        data: {
          actionKey: edge.data?.actionKey || '',
          actionLabel: edge.data?.actionLabel || '',
          requiresComment: edge.data?.requiresComment || false,
          autoAdvance: edge.data?.autoAdvance || false,
          conditionExpr: edge.data?.conditionExpr || '',
          ...edge.data,
        }
      }));

      setBuilderState(prev => {
        // console.log('loadWorkflow: Setting selectedWorkflow, preserving selectedNode:', prev.selectedNode);
        return {
          ...prev,
          selectedWorkflow: normalizedWorkflow,
          isDirty: false,
        };
      });
    } else {
      setBuilderState(prev => ({
        ...prev,
        selectedWorkflow: null,
        isDirty: false,
      }));
    }
  }, [setBuilderState]);

  // Auto-select workflow from URL parameter
  useEffect(() => {
    try {
      const workflowId = searchParams.get('id');
      const mode = searchParams.get('mode');
      
      console.log('URL Parameters:', { workflowId, mode });
      console.log('Workflows loaded:', workflows.length);
      console.log('Has auto selected:', hasAutoSelected);
      
      if (workflowId && workflows.length > 0 && !hasAutoSelected) {
        const selectedWorkflow = workflows.find(w => w.id === workflowId);
        console.log('Found workflow:', selectedWorkflow);
        
        if (selectedWorkflow) {
          console.log('Auto-selecting workflow from URL:', selectedWorkflow);
          handleWorkflowSelect(selectedWorkflow);
          setHasAutoSelected(true);
          
          // Set edit mode based on URL parameter
          if (mode === 'edit') {
            setBuilderState(prev => ({
              ...prev,
              isEditMode: true,
            }));
          } else {
            setBuilderState(prev => ({
              ...prev,
              isEditMode: false,
            }));
          }
        } else {
          console.warn('Workflow not found with ID:', workflowId);
        }
      }
      
      // If no URL parameter and no workflow selected, show dialog
      if (!workflowId && workflows.length > 0 && !builderState.selectedWorkflow && !workflowDialogOpen) {
        console.log('No URL parameter, showing workflow selection dialog');
        setWorkflowDialogOpen(true);
      }
    } catch (error) {
      console.error('Error in auto-select workflow effect:', error);
    }
  }, [searchParams, workflows, handleWorkflowSelect, hasAutoSelected, builderState.selectedWorkflow, workflowDialogOpen]);

  const handleNodesChange = useCallback((newNodes: WorkflowGraphNode[]) => {
    setBuilderState(prev => {
      if (!prev.selectedWorkflow) return prev;
      
      const updatedWorkflow = {
        ...prev.selectedWorkflow,
        graphJson: {
          ...prev.selectedWorkflow.graphJson,
          nodes: newNodes,
        },
      };
      
      return {
        ...prev,
        selectedWorkflow: updatedWorkflow,
        isDirty: true,
      };
    });
  }, [setBuilderState]);

  const handleEdgesChange = useCallback((newEdges: WorkflowGraphEdge[]) => {
    setBuilderState(prev => {
      if (!prev.selectedWorkflow) return prev;
      
      const updatedWorkflow = {
        ...prev.selectedWorkflow,
        graphJson: {
          ...prev.selectedWorkflow.graphJson,
          edges: newEdges,
        },
      };
      
      return {
        ...prev,
        selectedWorkflow: updatedWorkflow,
        isDirty: true,
      };
    });
  }, [setBuilderState]);

  const handleNodeSelect = useCallback((node: WorkflowGraphNode | null) => {
    // console.log('handleNodeSelect called with:', node);
    setBuilderState(prev => {
      // 既に選択されているノードと同じものをクリックした場合は何もしない
      if (prev.selectedNode?.id === node?.id) {
        // console.log('Same node already selected, skipping update');
        return prev;
      }
      
      // console.log('Updating builderState. Previous selectedNode:', prev.selectedNode);
      // console.log('New selectedNode:', node);
      const newState = {
        ...prev,
        selectedNode: node,
        selectedEdge: null, // ノード選択時はエッジの選択を解除
      };
      // console.log('setState returning:', newState);
      return newState;
    });
  }, [setBuilderState]);

  const handleEdgeSelect = useCallback((edge: WorkflowGraphEdge | null) => {
    setBuilderState(prev => ({
      ...prev,
      selectedEdge: edge,
      selectedNode: null,
    }));
  }, [setBuilderState]);

  const handleNodeUpdate = useCallback((updatedNode: WorkflowGraphNode) => {
    setBuilderState(prev => {
      if (!prev.selectedWorkflow) return prev;

      const updatedNodes = prev.selectedWorkflow.graphJson.nodes.map(node =>
        node.id === updatedNode.id ? updatedNode : node
      );

      // 複数の更新を1つのオブジェクトにまとめて返す
      return {
        ...prev,
        selectedWorkflow: {
          ...prev.selectedWorkflow,
          graphJson: {
            ...prev.selectedWorkflow.graphJson,
            nodes: updatedNodes,
          },
        },
        selectedNode: updatedNode,
        isDirty: true,
      };
    });
  }, [setBuilderState]);

  const handleEdgeUpdate = useCallback((updatedEdge: WorkflowGraphEdge) => {
    setBuilderState(prev => {
      if (!prev.selectedWorkflow) return prev;

      const updatedEdges = prev.selectedWorkflow.graphJson.edges.map(edge =>
        edge.id === updatedEdge.id ? updatedEdge : edge
      );

      return {
        ...prev,
        selectedWorkflow: {
          ...prev.selectedWorkflow,
          graphJson: {
            ...prev.selectedWorkflow.graphJson,
            edges: updatedEdges,
          },
        },
        selectedEdge: updatedEdge,
        isDirty: true,
      };
    });
  }, [setBuilderState]);

  const runValidation = useCallback(() => {
    const selectedWorkflow = builderState.selectedWorkflow;
    if (!selectedWorkflow) {
      setValidationResult(null);
      return;
    }

    const nodes = selectedWorkflow.graphJson?.nodes || [];
    const edges = selectedWorkflow.graphJson?.edges || [];

    const result = validateWorkflow(nodes, edges);
    setValidationResult(result);
  }, []);

  // Auto-validate when workflow changes
  useEffect(() => {
    runValidation();
  }, [runValidation]);

  const handleAutoLayout = useCallback(async () => {
    const selectedWorkflow = builderState.selectedWorkflow;
    if (!selectedWorkflow) return;

    try {
      // Import dagre dynamically to avoid SSR issues
      const dagre = await import('dagre');
      const dagreGraph = new dagre.graphlib.Graph();
      dagreGraph.setDefaultEdgeLabel(() => ({}));
      dagreGraph.setGraph({ rankdir: 'TB' });

      const nodes = selectedWorkflow.graphJson?.nodes || [];
      const edges = selectedWorkflow.graphJson?.edges || [];

      // Add nodes to dagre graph
      nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: 120, height: 80 });
      });

      // Add edges to dagre graph
      edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
      });

      // Calculate layout
      dagre.layout(dagreGraph);

      // Update node positions
      const updatedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
          ...node,
          position: {
            x: nodeWithPosition.x - nodeWithPosition.width / 2,
            y: nodeWithPosition.y - nodeWithPosition.height / 2,
          },
        };
      });

      handleNodesChange(updatedNodes);
    } catch (error) {
      // console.error('Auto-layout failed:', error);
    }
  }, [handleNodesChange]);

  const handleSave = useCallback(async () => {
    const selectedWorkflow = builderState.selectedWorkflow;
    if (!selectedWorkflow) return;
    
    // Validation check before save
    if (validationResult && !validationResult.isValid) {
      const confirmSave = confirm(
        `${validationResult.errors.length}個のエラーがあります。保存を続行しますか？`
      );
      if (!confirmSave) return;
    }
    
    try {
      setIsLoading(true);
      
      const workflowData = {
        name: selectedWorkflow.name,
        description: selectedWorkflow.description,
        version: selectedWorkflow.version,
        isActive: selectedWorkflow.isActive,
        graphJson: selectedWorkflow.graphJson,
      };

      if (selectedWorkflow.id.startsWith('new-')) {
        // Create new workflow
        const response = await workflowApi.createDefinition(workflowData);
        
        setBuilderState(prev => {
          if (!prev.selectedWorkflow) return prev;
          const savedWorkflow = { ...prev.selectedWorkflow, id: response.data.id };
          return {
            ...prev,
            selectedWorkflow: savedWorkflow,
            isDirty: false,
          };
        });
        
        // Reload workflows list
        await loadWorkflows();
      } else {
        // Update existing workflow
        await workflowApi.updateDefinition(selectedWorkflow.id, workflowData);
        
        setBuilderState(prev => ({
          ...prev,
          isDirty: false,
        }));
        
        // Update workflows list
        setWorkflows(prev => prev.map(w => 
          w.id === selectedWorkflow.id 
            ? { ...selectedWorkflow } 
            : w
        ));
      }
      
      // console.log('Workflow saved successfully');
    } catch (error) {
      // console.error('Failed to save workflow:', error);
      alert('ワークフローの保存に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  }, [loadWorkflows, validationResult]);

  const toggleEditMode = useCallback(() => {
    setBuilderState(prev => ({
      ...prev,
      isEditMode: !prev.isEditMode,
    }));
  }, []);

  // Handle page errors
  if (pageError) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error">
          エラーが発生しました
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          {pageError}
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => {
            setPageError(null);
            window.location.reload();
          }}
          sx={{ mt: 2 }}
        >
          ページを再読み込み
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <AccountTree sx={{ mr: 2 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            ワークフロービルダー
            {builderState.selectedWorkflow && (
              <Typography variant="subtitle2" component="span" sx={{ ml: 2, color: 'text.secondary' }}>
                {builderState.selectedWorkflow.name}
                {builderState.isDirty && ' *'}
              </Typography>
            )}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={builderState.isEditMode}
                  onChange={toggleEditMode}
                  disabled={!builderState.selectedWorkflow}
                />
              }
              label={builderState.isEditMode ? "編集モード" : "プレビューモード"}
            />
            
            <Tooltip title="自動整列">
              <span>
                <IconButton 
                  disabled={!builderState.selectedWorkflow || !builderState.isEditMode}
                  onClick={handleAutoLayout}
                >
                  <AutoFixHigh />
                </IconButton>
              </span>
            </Tooltip>
            
            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={() => setWorkflowDialogOpen(true)}
            >
              ワークフロー選択
            </Button>
            
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSave}
              disabled={!builderState.selectedWorkflow || !builderState.isDirty || isLoading}
            >
              {isLoading ? '保存中...' : '保存'}
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex' }}>
        <Grid container sx={{ height: '100%' }}>
          {/* Left Panel - Node Palette */}
          <Grid item xs={2}>
            <Paper sx={{ height: '100%', borderRadius: 0 }}>
              <NodePalette isEditMode={builderState.isEditMode} />
            </Paper>
          </Grid>

          {/* Center Panel - Canvas */}
          <Grid item xs={7}>
            <Paper sx={{ height: '100%', position: 'relative', borderRadius: 0 }}>
              {builderState.selectedWorkflow ? (
                <WorkflowCanvas
                  nodes={builderState.selectedWorkflow.graphJson.nodes}
                  edges={builderState.selectedWorkflow.graphJson.edges}
                  onNodesChange={handleNodesChange}
                  onEdgesChange={handleEdgesChange}
                  onNodeSelect={handleNodeSelect}
                  onEdgeSelect={handleEdgeSelect}
                  isEditMode={builderState.isEditMode}
                />
              ) : (
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="h6" color="text.secondary">
                    ワークフローを選択してください
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Right Panel - Properties & Validation */}
          <Grid item xs={3}>
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* Properties Panel */}
              <Paper sx={{ flex: 1, borderRadius: 0, borderBottom: '1px solid #e0e0e0' }}>
                {(() => {
                  // console.log('Rendering PropertyPanel with selectedNode:', builderState.selectedNode);
                  // console.log('builderState.selectedNode type:', typeof builderState.selectedNode);
                  // console.log('builderState.selectedNode === null:', builderState.selectedNode === null);
                  return (
                    <PropertyPanel
                      selectedNode={builderState.selectedNode}
                      selectedEdge={builderState.selectedEdge}
                      onNodeUpdate={handleNodeUpdate}
                      onEdgeUpdate={handleEdgeUpdate}
                      isEditMode={builderState.isEditMode}
                    />
                  );
                })()}
              </Paper>
              
              {/* Validation Panel */}
              <Paper sx={{ height: '300px', borderRadius: 0, overflow: 'auto' }}>
                <ValidationPanel
                  validationResult={validationResult}
                  onRevalidate={runValidation}
                  onSelectNode={(nodeId) => {
                    const selectedWorkflow = builderState.selectedWorkflow;
                    const node = selectedWorkflow?.graphJson.nodes.find(n => n.id === nodeId);
                    if (node) handleNodeSelect(node);
                  }}
                  onSelectEdge={(edgeId) => {
                    const selectedWorkflow = builderState.selectedWorkflow;
                    const edge = selectedWorkflow?.graphJson.edges.find(e => e.id === edgeId);
                    if (edge) handleEdgeSelect(edge);
                  }}
                />
              </Paper>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Workflow Selection Dialog */}
      <WorkflowSelectionDialog
        open={workflowDialogOpen}
        onClose={() => setWorkflowDialogOpen(false)}
        onSelect={handleWorkflowSelect}
        workflows={workflows}
      />
    </Box>
  );
};

export default WorkflowBuilderPage;