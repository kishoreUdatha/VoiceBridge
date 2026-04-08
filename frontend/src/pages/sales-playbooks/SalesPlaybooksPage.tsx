/**
 * Sales Playbooks Page
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  IconButton,
  Avatar,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  MenuBook as PlaybookIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as StepIcon,
  Psychology as ObjectionIcon,
  EmojiObjects as TipIcon,
  Warning as BattleIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  PlayArrow as StartIcon,
} from '@mui/icons-material';

// Service interfaces
interface SalesPlaybook {
  id: string;
  name: string;
  description?: string;
  type: 'SALES_PROCESS' | 'OBJECTION_HANDLING' | 'COMPETITOR_BATTLE_CARD' | 'BEST_PRACTICES';
  stages?: PlaybookStage[];
  objections?: ObjectionHandler[];
  battleCards?: BattleCard[];
  tips?: string[];
  targetRole?: string;
  industry?: string;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
}

interface PlaybookStage {
  name: string;
  description?: string;
  order: number;
  activities: string[];
  exitCriteria?: string[];
  resources?: string[];
}

interface ObjectionHandler {
  objection: string;
  response: string;
  category?: string;
  examples?: string[];
}

interface BattleCard {
  competitor: string;
  strengths: string[];
  weaknesses: string[];
  ourAdvantages: string[];
  talkingPoints: string[];
}

const SalesPlaybooksPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playbooks, setPlaybooks] = useState<SalesPlaybook[]>([]);
  const [expandedPlaybook, setExpandedPlaybook] = useState<string | false>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Mock data for demonstration
      const mockPlaybooks: SalesPlaybook[] = [
        {
          id: '1',
          name: 'Enterprise Sales Process',
          description: 'Step-by-step guide for closing enterprise deals',
          type: 'SALES_PROCESS',
          stages: [
            { name: 'Discovery', order: 1, activities: ['Initial call', 'Needs assessment', 'Stakeholder mapping'], exitCriteria: ['Budget confirmed', 'Timeline established'] },
            { name: 'Demo', order: 2, activities: ['Product demo', 'Technical deep-dive', 'ROI presentation'], exitCriteria: ['Technical approval', 'Business case accepted'] },
            { name: 'Proposal', order: 3, activities: ['Pricing discussion', 'Contract review', 'Negotiation'], exitCriteria: ['Terms agreed', 'Final approval'] },
            { name: 'Close', order: 4, activities: ['Contract signing', 'Onboarding handoff', 'Success planning'], exitCriteria: ['Contract signed', 'Payment received'] },
          ],
          isActive: true,
          usageCount: 156,
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'Common Objection Handlers',
          description: 'Responses to frequently heard objections',
          type: 'OBJECTION_HANDLING',
          objections: [
            { objection: 'Too expensive', response: 'Let me show you the ROI calculation...', category: 'Price', examples: ['Focus on total cost of ownership', 'Compare with cost of inaction'] },
            { objection: 'We already have a solution', response: 'What specific challenges are you facing with your current solution?', category: 'Competition', examples: ['Ask about pain points', 'Highlight unique features'] },
            { objection: 'Need to think about it', response: 'Absolutely! What specific aspects would you like to consider?', category: 'Timing', examples: ['Identify concerns', 'Offer to address specific questions'] },
          ],
          isActive: true,
          usageCount: 89,
          createdAt: new Date().toISOString(),
        },
        {
          id: '3',
          name: 'Competitor Battle Cards',
          description: 'Competitive intelligence for key competitors',
          type: 'COMPETITOR_BATTLE_CARD',
          battleCards: [
            {
              competitor: 'Competitor A',
              strengths: ['Strong brand recognition', 'Large customer base'],
              weaknesses: ['Outdated UI', 'Limited integrations', 'Slow support'],
              ourAdvantages: ['Modern interface', '50+ integrations', '24/7 support'],
              talkingPoints: ['Ask about their integration challenges', 'Highlight our API capabilities'],
            },
            {
              competitor: 'Competitor B',
              strengths: ['Low price point', 'Easy setup'],
              weaknesses: ['Limited features', 'No AI capabilities', 'Poor scalability'],
              ourAdvantages: ['AI-powered insights', 'Enterprise-grade scaling', 'Advanced analytics'],
              talkingPoints: ['Focus on long-term value', 'Demonstrate AI features'],
            },
          ],
          isActive: true,
          usageCount: 67,
          createdAt: new Date().toISOString(),
        },
      ];
      setPlaybooks(mockPlaybooks);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'SALES_PROCESS': return <PlaybookIcon />;
      case 'OBJECTION_HANDLING': return <ObjectionIcon />;
      case 'COMPETITOR_BATTLE_CARD': return <BattleIcon />;
      case 'BEST_PRACTICES': return <TipIcon />;
      default: return <PlaybookIcon />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'SALES_PROCESS': return 'primary';
      case 'OBJECTION_HANDLING': return 'success';
      case 'COMPETITOR_BATTLE_CARD': return 'error';
      case 'BEST_PRACTICES': return 'info';
      default: return 'default';
    }
  };

  const filterPlaybooks = (type?: string) => {
    if (!type) return playbooks;
    return playbooks.filter(p => p.type === type);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          <PlaybookIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Sales Playbooks
        </Typography>
        <Box>
          <Button startIcon={<RefreshIcon />} onClick={loadData} sx={{ mr: 1 }}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<AddIcon />}>
            New Playbook
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PlaybookIcon sx={{ fontSize: 32, color: 'primary.main' }} />
              <Typography variant="h4">{playbooks.length}</Typography>
              <Typography variant="caption" color="text.secondary">Total Playbooks</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <StepIcon sx={{ fontSize: 32, color: 'success.main' }} />
              <Typography variant="h4">{filterPlaybooks('SALES_PROCESS').length}</Typography>
              <Typography variant="caption" color="text.secondary">Sales Processes</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <ObjectionIcon sx={{ fontSize: 32, color: 'warning.main' }} />
              <Typography variant="h4">{filterPlaybooks('OBJECTION_HANDLING').length}</Typography>
              <Typography variant="caption" color="text.secondary">Objection Handlers</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <BattleIcon sx={{ fontSize: 32, color: 'error.main' }} />
              <Typography variant="h4">{filterPlaybooks('COMPETITOR_BATTLE_CARD').length}</Typography>
              <Typography variant="caption" color="text.secondary">Battle Cards</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab label="All Playbooks" />
        <Tab label="Sales Processes" />
        <Tab label="Objection Handlers" />
        <Tab label="Battle Cards" />
      </Tabs>

      {/* Playbooks List */}
      {tabValue === 0 && (
        <Grid container spacing={2}>
          {playbooks.map((playbook) => (
            <Grid size={12} key={playbook.id}>
              <Accordion
                expanded={expandedPlaybook === playbook.id}
                onChange={() => setExpandedPlaybook(expandedPlaybook === playbook.id ? false : playbook.id)}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', pr: 2 }}>
                    <Avatar sx={{ bgcolor: `${getTypeColor(playbook.type)}.light` }}>
                      {getTypeIcon(playbook.type)}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        {playbook.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {playbook.description}
                      </Typography>
                    </Box>
                    <Chip
                      label={playbook.type.replace(/_/g, ' ')}
                      size="small"
                      color={getTypeColor(playbook.type) as any}
                      variant="outlined"
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 80, textAlign: 'right' }}>
                      {playbook.usageCount} uses
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {/* Sales Process */}
                  {playbook.type === 'SALES_PROCESS' && playbook.stages && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ mb: 2 }}>Stages</Typography>
                      <Grid container spacing={2}>
                        {playbook.stages.map((stage, idx) => (
                          <Grid size={{ xs: 12, md: 6, lg: 3 }} key={idx}>
                            <Card variant="outlined">
                              <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                  <Avatar sx={{ width: 24, height: 24, mr: 1, bgcolor: 'primary.main', fontSize: '0.75rem' }}>
                                    {stage.order}
                                  </Avatar>
                                  <Typography variant="subtitle2">{stage.name}</Typography>
                                </Box>
                                <List dense>
                                  {stage.activities.map((activity, aidx) => (
                                    <ListItem key={aidx} sx={{ py: 0 }}>
                                      <ListItemIcon sx={{ minWidth: 24 }}>
                                        <StepIcon sx={{ fontSize: 16, color: 'success.main' }} />
                                      </ListItemIcon>
                                      <ListItemText primary={activity} primaryTypographyProps={{ variant: 'body2' }} />
                                    </ListItem>
                                  ))}
                                </List>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}

                  {/* Objection Handling */}
                  {playbook.type === 'OBJECTION_HANDLING' && playbook.objections && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ mb: 2 }}>Objection Handlers</Typography>
                      {playbook.objections.map((obj, idx) => (
                        <Card key={idx} variant="outlined" sx={{ mb: 2 }}>
                          <CardContent>
                            <Typography variant="subtitle2" color="error.main" sx={{ mb: 1 }}>
                              "{obj.objection}"
                            </Typography>
                            <Typography variant="body2" color="success.main" sx={{ mb: 1 }}>
                              Response: {obj.response}
                            </Typography>
                            {obj.examples && obj.examples.length > 0 && (
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="caption" color="text.secondary">Tips:</Typography>
                                <ul style={{ margin: 0, paddingLeft: 20 }}>
                                  {obj.examples.map((ex, eidx) => (
                                    <li key={eidx}>
                                      <Typography variant="caption">{ex}</Typography>
                                    </li>
                                  ))}
                                </ul>
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </Box>
                  )}

                  {/* Battle Cards */}
                  {playbook.type === 'COMPETITOR_BATTLE_CARD' && playbook.battleCards && (
                    <Grid container spacing={2}>
                      {playbook.battleCards.map((card, idx) => (
                        <Grid size={{ xs: 12, md: 6 }} key={idx}>
                          <Card variant="outlined">
                            <CardContent>
                              <Typography variant="h6" sx={{ mb: 2 }}>{card.competitor}</Typography>
                              <Grid container spacing={2}>
                                <Grid size={6}>
                                  <Typography variant="caption" color="error.main" sx={{ fontWeight: 'bold' }}>Their Strengths</Typography>
                                  <ul style={{ margin: '4px 0', paddingLeft: 16 }}>
                                    {card.strengths.map((s, sidx) => (
                                      <li key={sidx}><Typography variant="body2">{s}</Typography></li>
                                    ))}
                                  </ul>
                                </Grid>
                                <Grid size={6}>
                                  <Typography variant="caption" color="warning.main" sx={{ fontWeight: 'bold' }}>Their Weaknesses</Typography>
                                  <ul style={{ margin: '4px 0', paddingLeft: 16 }}>
                                    {card.weaknesses.map((w, widx) => (
                                      <li key={widx}><Typography variant="body2">{w}</Typography></li>
                                    ))}
                                  </ul>
                                </Grid>
                                <Grid size={12}>
                                  <Divider sx={{ my: 1 }} />
                                  <Typography variant="caption" color="success.main" sx={{ fontWeight: 'bold' }}>Our Advantages</Typography>
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                    {card.ourAdvantages.map((a, aidx) => (
                                      <Chip key={aidx} label={a} size="small" color="success" variant="outlined" />
                                    ))}
                                  </Box>
                                </Grid>
                              </Grid>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  )}

                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    <Button size="small" startIcon={<EditIcon />}>Edit</Button>
                    <Button size="small" variant="contained" startIcon={<StartIcon />}>Use Playbook</Button>
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Sales Processes Tab */}
      {tabValue === 1 && (
        <Grid container spacing={2}>
          {filterPlaybooks('SALES_PROCESS').map((playbook) => (
            <Grid size={12} key={playbook.id}>
              {/* Similar content as above for sales processes */}
              <Card>
                <CardContent>
                  <Typography variant="h6">{playbook.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{playbook.description}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Objection Handlers Tab */}
      {tabValue === 2 && (
        <Grid container spacing={2}>
          {filterPlaybooks('OBJECTION_HANDLING').map((playbook) => (
            <Grid size={12} key={playbook.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6">{playbook.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{playbook.description}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Battle Cards Tab */}
      {tabValue === 3 && (
        <Grid container spacing={2}>
          {filterPlaybooks('COMPETITOR_BATTLE_CARD').map((playbook) => (
            <Grid size={12} key={playbook.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6">{playbook.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{playbook.description}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default SalesPlaybooksPage;
