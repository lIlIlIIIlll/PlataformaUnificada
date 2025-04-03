// app/layout.js
import React from 'react';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import AntdLayout from './components/AntdLayout'; // <-- Import the client wrapper component

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{padding:0,margin:0}}>
        {/* Wrap the layout component with AntdRegistry */}
        <AntdRegistry>
          {/* Use the Client Component wrapper */}
          <AntdLayout>
            {children} {/* Page content will be rendered here */}
          </AntdLayout>
        </AntdRegistry>
      </body>
    </html>
  );
}