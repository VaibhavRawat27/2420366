"use client";

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  CircularProgress,
  Alert,
  Stack,
  IconButton,
  Tooltip,
  Paper,
  Divider,
  Badge,
} from '@mui/material';
import PlacementIcon from '@mui/icons-material/Work';
import ResultIcon from '@mui/icons-material/EmojiEvents';
import EventIcon from '@mui/icons-material/Event';
import InfoIcon from '@mui/icons-material/InfoOutlined';
import CheckIcon from '@mui/icons-material/Check';
import StarIcon from '@mui/icons-material/Star';

const BACKEND_URL = 'http://localhost:5000/api/notifications/priority';

const TYPE_ICONS = {
  Event: <EventIcon />,
  Result: <ResultIcon />,
  Placement: <PlacementIcon />,
};

const TYPE_COLORS = {
  Event: 'info',
  Result: 'warning',
  Placement: 'success',
};

export default function PriorityInbox() {
  // State
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nLimit, setNLimit] = useState(10);
  const [typeFilter, setTypeFilter] = useState('All');
  const [readIds, setReadIds] = useState(new Set());
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  // Load read notifications from LocalStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('read_notifications');
      if (stored) {
        setReadIds(new Set(JSON.parse(stored)));
      }
    } catch (err) {
      console.error('Failed to load read notifications:', err);
    }
  }, []);

  // Fetch priority notifications
  useEffect(() => {
    let isMounted = true;
    const fetchPriority = async () => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams({
          n: nLimit.toString(),
        });
        
        // Pass readIds so backend filters them out
        if (readIds.size > 0) {
          queryParams.append('readIds', Array.from(readIds).join(','));
        }

        const response = await fetch(`${BACKEND_URL}?${queryParams.toString()}`);
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(errText || `Server returned ${response.status}`);
        }
        const data = await response.json();
        if (isMounted) {
          setNotifications(data.notifications || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to fetch priority notifications from backend.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPriority();
    return () => {
      isMounted = false;
    };
  }, [nLimit, readIds, refetchTrigger]);

  // Mark a single notification as read (and thus remove it from priority view)
  const handleMarkAsRead = (id) => {
    const updated = new Set(readIds);
    updated.add(id);
    setReadIds(updated);
    localStorage.setItem('read_notifications', JSON.stringify(Array.from(updated)));
    
    // We immediately trigger client-side filtering out of the read ID to feel instant, 
    // and let useEffect update the server-side queue.
    setNotifications((prev) => prev.filter((item) => item.ID !== id));
  };

  const handleNLimitChange = (e) => {
    setNLimit(e.target.value);
  };

  const handleTypeFilterChange = (e) => {
    setTypeFilter(e.target.value);
  };

  // Client-side calculate Priority Score for UI presentation
  const getPriorityScore = (type, timestamp) => {
    const weights = { Placement: 3, Result: 2, Event: 1 };
    const weight = weights[type] || 0;

    // Recency score = 1 / (1 + hours_since_notification)
    const timeDiff = new Date() - new Date(timestamp.replace(' ', 'T'));
    const hours = Math.max(0, timeDiff / (1000 * 60 * 60));
    const recency = 1 / (1 + hours);

    return (weight * recency).toFixed(3);
  };

  // Client-side filter on Type for the Top-N results
  const filteredNotifications = typeFilter === 'All'
    ? notifications
    : notifications.filter((notif) => notif.Type === typeFilter);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Title Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <StarIcon color="warning" sx={{ fontSize: 36 }} /> Priority Inbox
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Surfacing the top most important unread notifications based on type weight (Placement &gt; Result &gt; Event) and recency decay.
        </Typography>
      </Box>

      {/* Settings Panel */}
      <Paper sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: '12px' }} elevation={0}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="n-limit-label">Priority Size (N)</InputLabel>
              <Select
                labelId="n-limit-label"
                value={nLimit}
                label="Priority Size (N)"
                onChange={handleNLimitChange}
              >
                <MenuItem value={5}>Top 5</MenuItem>
                <MenuItem value={10}>Top 10</MenuItem>
                <MenuItem value={15}>Top 15</MenuItem>
                <MenuItem value={20}>Top 20</MenuItem>
                <MenuItem value={30}>Top 30</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="type-filter-priority-label">Filter Feed</InputLabel>
              <Select
                labelId="type-filter-priority-label"
                value={typeFilter}
                label="Filter Feed"
                onChange={handleTypeFilterChange}
              >
                <MenuItem value="All">All Types</MenuItem>
                <MenuItem value="Placement">Placement Only</MenuItem>
                <MenuItem value="Result">Result Only</MenuItem>
                <MenuItem value="Event">Event Only</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4} sx={{ textAlign: { sm: 'right' } }}>
            <Tooltip title="Score = Type Weight (Placement:3, Result:2, Event:1) * [1 / (1 + hours_since_notification)]">
              <Button startIcon={<InfoIcon />} color="inherit" size="small" variant="text">
                How is it scored?
              </Button>
            </Tooltip>
          </Grid>
        </Grid>
      </Paper>

      {/* Main Content Feed */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={48} />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ borderRadius: '12px', mb: 3 }}>
          {error}
        </Alert>
      ) : filteredNotifications.length === 0 ? (
        <Paper sx={{ py: 8, px: 2, textAlign: 'center', borderRadius: '12px', border: '1px solid', borderColor: 'divider' }} elevation={0}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Your Priority Inbox is Empty!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            All high-priority notifications have been read. Switch to "All Notifications" to view older announcements.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {filteredNotifications.map((notif, index) => {
            const score = getPriorityScore(notif.Type, notif.Timestamp);
            return (
              <Card
                key={notif.ID}
                sx={{
                  transition: 'all 0.2s ease-in-out',
                  borderLeft: `5px solid var(--mui-palette-${TYPE_COLORS[notif.Type]}-main)`,
                  position: 'relative',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  },
                }}
              >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Grid container spacing={2} alignItems="center">
                    {/* Rank Badge */}
                    <Grid item>
                      <Badge badgeContent={index + 1} color="warning" overlap="circular" sx={{ mr: 1, '& .MuiBadge-badge': { fontWeight: 750 } }}>
                        <Chip
                          icon={TYPE_ICONS[notif.Type]}
                          label={notif.Type}
                          color={TYPE_COLORS[notif.Type]}
                          size="small"
                          sx={{ fontWeight: 700 }}
                        />
                      </Badge>
                    </Grid>

                    {/* Priority score badge */}
                    <Grid item>
                      <Tooltip title="Priority Score (Higher is more critical/recent)">
                        <Chip
                          label={`Score: ${score}`}
                          variant="outlined"
                          size="small"
                          color="primary"
                          sx={{ height: 20, fontSize: '0.75rem', fontWeight: 600 }}
                        />
                      </Tooltip>
                    </Grid>

                    {/* Timestamp */}
                    <Grid item xs sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" color="text.secondary">
                        {notif.Timestamp}
                      </Typography>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 1 }} />

                  {/* Message details */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 700,
                        color: 'text.primary',
                        pr: 2,
                      }}
                    >
                      {notif.Message}
                    </Typography>
                    
                    <Tooltip title="Mark as read and remove from priority list">
                      <IconButton
                        color="success"
                        size="medium"
                        onClick={() => handleMarkAsRead(notif.ID)}
                        sx={{
                          border: '1px solid',
                          borderColor: 'success.light',
                          '&:hover': { bgcolor: 'success.light', color: 'success.contrastText' },
                        }}
                      >
                        <CheckIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}
    </Container>
  );
}
