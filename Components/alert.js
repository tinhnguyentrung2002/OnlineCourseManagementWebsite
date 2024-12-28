import React from 'react';
import { useEffect } from 'react';
import { Alert } from '@mui/material';
import '../css/Alert.css'; 

const AlertPopup = ({ alert, setAlert }) => {
    useEffect(() => {
        if (alert.message) {
            const timer = setTimeout(() => {
                setAlert({ message: '', severity: '' });
            }, 2000);

            return () => clearTimeout(timer);
        }
    }, [alert, setAlert]);

    return (
        <>
            { alert.message && (
                <Alert
                    className="alert-custom"
                    severity={alert.severity}
                    onClose={() => setAlert({ message: '', severity: '' })}>
                    {alert.message}
                </Alert>
            )}
        </>
    );
};

export default AlertPopup;
