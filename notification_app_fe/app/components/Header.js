"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  Container,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import InboxIcon from '@mui/icons-material/Inbox';
import DarkModeIcon from '@mui/icons-material/Brightness4';
import LightModeIcon from '@mui/icons-material/Brightness7';
import { useColorMode } from './ClientThemeProvider';

export default function Header() {
  const pathname = usePathname();
  const theme = useTheme();
  const { toggleColorMode } = useColorMode();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const menuItems = [
    { text: 'All Notifications', href: '/', icon: <NotificationsIcon /> },
    { text: 'Priority Inbox', href: '/priority', icon: <InboxIcon /> },
  ];

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  return (
    <AppBar position="sticky" color="default" elevation={0} sx={{ borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}>
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ display: 'flex', justifyContent: 'space-between' }}>
          {/* Logo Section */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NotificationsIcon color="primary" sx={{ fontSize: 28 }} />
            <Typography
              variant="h6"
              noWrap
              sx={{
                fontWeight: 700,
                letterSpacing: '-0.02em',
                background: 'linear-gradient(45deg, #6366f1 30%, #ec4899 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                cursor: 'pointer',
              }}
            >
              UniNotify
            </Typography>
          </Box>

          {/* Desktop Nav Items */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
            {menuItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link key={item.text} href={item.href} passHref style={{ textDecoration: 'none' }}>
                  <Button
                    startIcon={item.icon}
                    variant={active ? 'contained' : 'text'}
                    color={active ? 'primary' : 'inherit'}
                    sx={{
                      px: 2,
                      py: 1,
                      fontWeight: active ? 700 : 500,
                      borderRadius: '8px',
                    }}
                  >
                    {item.text}
                  </Button>
                </Link>
              );
            })}
          </Box>

          {/* Right Actions (Theme Toggle, Mobile Menu) */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={toggleColorMode} color="inherit" aria-label="Toggle theme">
              {theme.palette.mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>

            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </Container>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
      >
        <Box sx={{ width: 250, pt: 2 }} role="presentation" onClick={handleDrawerToggle}>
          <Typography variant="h6" sx={{ px: 2, pb: 2, fontWeight: 700 }}>
            Menu
          </Typography>
          <List>
            {menuItems.map((item) => {
              const active = pathname === item.href;
              return (
                <ListItem key={item.text} disablePadding>
                  <Link href={item.href} style={{ textDecoration: 'none', width: '100%' }}>
                    <ListItemButton selected={active} sx={{ borderRadius: '0 24px 24px 0', mr: 2 }}>
                      <ListItemIcon sx={{ color: active ? 'primary.main' : 'inherit' }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.text}
                        primaryTypographyProps={{
                          fontWeight: active ? 700 : 500,
                          color: active ? 'primary.main' : 'inherit',
                        }}
                      />
                    </ListItemButton>
                  </Link>
                </ListItem>
              );
            })}
          </List>
        </Box>
      </Drawer>
    </AppBar>
  );
}
