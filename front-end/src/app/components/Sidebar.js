// components/Sidebar.js
"use client"; // Add this if Sidebar uses hooks or event handlers indirectly via Menu

import React from 'react';
import { Menu } from 'antd'; // Only import Menu, not Layout or Sider
import {
  DashboardOutlined,
  TeamOutlined,
  ProjectOutlined,
  CalendarOutlined,
  ReadOutlined, // Assuming this is Training
  ClockCircleOutlined,
  BarChartOutlined,
  SettingOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation'; // Import usePathname

// Helper function to create menu items
function getItem(label, key, icon, children) {
  return {
    key,
    icon,
    children,
    label,
  };
}

const Sidebar = () => {
  const pathname = usePathname(); // Get the current path

  // Define menu items using the recommended 'items' prop structure
  const menuItems = [
    getItem(<Link href="/dashboard">Dashboard</Link>, '/dashboard', <DashboardOutlined />),
    getItem(<Link href="/people">People</Link>, '/people', <TeamOutlined />),
    getItem(<Link href="/projects">Projects</Link>, '/projects', <ProjectOutlined />),
    getItem(<Link href="/calendar">Calendar</Link>, '/calendar', <CalendarOutlined />),
    getItem(<Link href="/training">Training</Link>, '/training', <ReadOutlined />),
    getItem(<Link href="/timesheet">Timesheet</Link>, '/timesheet', <ClockCircleOutlined />),
    getItem(<Link href="/reports">Reports</Link>, '/reports', <BarChartOutlined />),
    getItem(<Link href="/administration">Administration</Link>, '/administration', <SettingOutlined />),
    getItem(<Link href="/help">Help</Link>, '/help', <QuestionCircleOutlined />),
    // Add more items or submenus as needed following this pattern
  ];

  // Determine the selected key based on the current pathname
  // Find the item whose key matches the current path
  const currentSelectedItem = menuItems.find(item => item.key === pathname);
  const selectedKeys = currentSelectedItem ? [currentSelectedItem.key] : [];


  return (
    // Remove the Sider component from here - it's handled in AntdLayout.js
    <Menu
      theme="light" // Match theme from AntdLayout Sider if needed
      mode="inline"
      selectedKeys={selectedKeys} // Use dynamically selected keys
      style={{ height: '100%', borderRight: 0, borderRadius:'8px' }}
      items={menuItems} // Pass the array to the 'items' prop
    />
  );
};

export default Sidebar;