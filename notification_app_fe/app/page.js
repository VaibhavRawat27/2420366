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
} from '@mui/material';
import PlacementIcon from '@mui/icons-material/Work';
import ResultIcon from '@mui/icons-material/EmojiEvents';
import EventIcon from '@mui/icons-material/Event';
import ReadIcon from '@mui/icons-material/CheckCircleOutlined';
import MarkReadIcon from '@mui/icons-material/MarkChatRead';
import PrevIcon from '@mui/icons-material/NavigateBefore';
import NextIcon from '@mui/icons-material/NavigateNext';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const BACKEND_URL = 'http://localhost:5000/api/notifications';

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

export default function AllNotifications() {
  // State
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [typeFilter, setTypeFilter] = useState('All');
  const [readIds, setReadIds] = useState(new Set());
  const [expandedId, setExpandedId] = useState(null);

  // Load read notifications from LocalStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('read_notifications');
      if (stored) {
        setReadIds(new Set(JSON.parse(stored)));
      }
    } catch (err) {
      console.error('Failed to load read notifications from localStorage:', err);
    }
  }, []);

  // Fetch notifications when filters or pagination changes
  useEffect(() => {
    let isMounted = true;
    const fetchNotifications = async () => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });
        if (typeFilter !== 'All') {
          queryParams.append('notification_type', typeFilter);
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
          setError(err.message || 'Failed to fetch notifications from backend server.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchNotifications();
    return () => {
      isMounted = false;
    };
  }, [page, limit, typeFilter]);

  // Mark a single notification as read
  const handleMarkAsRead = (id) => {
    const updated = new Set(readIds);
    updated.add(id);
    setReadIds(updated);
    localStorage.setItem('read_notifications', JSON.stringify(Array.from(updated)));
  };

  // Toggle expand notification card
  const handleCardClick = (id) => {
    setExpandedId(expandedId === id ? null : id);
    handleMarkAsRead(id);
  };

  // Mark all on the current page as read
  const handleMarkPageAsRead = () => {
    const updated = new Set(readIds);
    notifications.forEach((n) => updated.add(n.ID));
    setReadIds(updated);
    localStorage.setItem('read_notifications', JSON.stringify(Array.from(updated)));
  };

  const handleFilterChange = (e) => {
    setTypeFilter(e.target.value);
    setPage(1); // Reset to page 1 on filter change
  };

  const handleLimitChange = (e) => {
    setLimit(e.target.value);
    setPage(1); // Reset to page 1 on limit change
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Title Header */}
      <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 800 }}>
            All Notifications
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Keep track of latest announcements, events, and job placement offers.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<MarkReadIcon />}
          onClick={handleMarkPageAsRead}
          disabled={notifications.length === 0}
          sx={{ py: 1, px: 2 }}
        >
          Mark Page Read
        </Button>
      </Box>

      {/* Filters Bar */}
      <Paper sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: '12px' }} elevation={0}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel id="type-filter-label">Filter by Type</InputLabel>
              <Select
                labelId="type-filter-label"
                value={typeFilter}
                label="Filter by Type"
                onChange={handleFilterChange}
              >
                <MenuItem value="All">All Types</MenuItem>
                <MenuItem value="Placement">Placement</MenuItem>
                <MenuItem value="Result">Result</MenuItem>
                <MenuItem value="Event">Event</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel id="limit-select-label">Items per page</InputLabel>
              <Select
                labelId="limit-select-label"
                value={limit}
                label="Items per page"
                onChange={handleLimitChange}
              >
                <MenuItem value={5}>5 per page</MenuItem>
                <MenuItem value={10}>10 per page</MenuItem>
                <MenuItem value={20}>20 per page</MenuItem>
                <MenuItem value={50}>50 per page</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Main Feed Content */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={48} />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ borderRadius: '12px', mb: 3 }}>
          {error}
        </Alert>
      ) : notifications.length === 0 ? (
        <Paper sx={{ py: 8, px: 2, textAlign: 'center', borderRadius: '12px', border: '1px solid', borderColor: 'divider' }} elevation={0}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Notifications Found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try resetting your filters or checking back later.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {notifications.map((notif) => {
            const isRead = readIds.has(notif.ID);
            const isExpanded = expandedId === notif.ID;

            return (
              <Card
                key={notif.ID}
                onClick={() => handleCardClick(notif.ID)}
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  opacity: isRead ? 0.7 : 1,
                  bgcolor: isRead ? 'action.hover' : 'background.paper',
                  borderLeft: `5px solid ${isRead ? 'transparent' : `var(--mui-palette-${TYPE_COLORS[notif.Type] || 'primary'}-main)`
                    }`,
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  },
                }}
              >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Grid container spacing={2} alignItems="center">
                    {/* Icon Badge */}
                    <Grid item>
                      <Chip
                        icon={TYPE_ICONS[notif.Type]}
                        label={notif.Type}
                        color={TYPE_COLORS[notif.Type]}
                        size="small"
                        variant={isRead ? 'outlined' : 'filled'}
                        sx={{ fontWeight: 700 }}
                      />
                    </Grid>

                    {/* Unread indicator */}
                    {!isRead && (
                      <Grid item>
                        <Chip
                          label="NEW"
                          color="primary"
                          size="small"
                          sx={{ fontSize: '0.65rem', height: 18, fontWeight: 800 }}
                        />
                      </Grid>
                    )}

                    {/* Timestamp */}
                    <Grid item xs sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" color="text.secondary">
                        {notif.Timestamp}
                      </Typography>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 1 }} />

                  {/* Message details */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mt: 1 }}>
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: isRead ? 500 : 700,
                        color: isRead ? 'text.secondary' : 'text.primary',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: isExpanded ? 'block' : '-webkit-box',
                        WebkitLineClamp: isExpanded ? 'none' : 1,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {notif.Message}
                    </Typography>
                    <IconButton size="small" color="inherit">
                      {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Box>

                  {/* Additional details displayed when expanded */}
                  {isExpanded && (
                    <Box sx={{ mt: 2, pl: 1, borderLeft: '2px solid', borderColor: 'primary.light' }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Notification ID:</strong> {notif.ID}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Category:</strong> {notif.Type} Announcement
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      {/* Pagination controls */}
      {!loading && !error && notifications.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4 }}>
          <Typography variant="body2" color="text.secondary">
            Page {page}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<PrevIcon />}
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outlined"
              size="small"
              endIcon={<NextIcon />}
              onClick={() => setPage((prev) => prev + 1)}
              disabled={notifications.length < limit}
            >
              Next
            </Button>
          </Stack>
        </Box>
      )}
    </Container>
  );
}
