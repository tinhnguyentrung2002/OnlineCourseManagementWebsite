import React from 'react';
import { CircularProgress } from '@mui/material';

const Loading = () => {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.8)', 
            zIndex: 9999
        }}>
            <CircularProgress />
        </div>
    );
};

export default Loading;
