import React from 'react';
import { makeStyles } from '@mui/styles';
import { useNavigate } from 'react-router-dom';

const useStyles = makeStyles({
  notFound: {
    textAlign: 'center',
    padding: '50px',
    backgroundColor: '#f8f9fa',
    color: '#333',
  },
  title: {
    fontSize: '48px',
    color: '#dc3545',
  },
  message: {
    fontSize: '24px',
  },
  button: {
    marginTop: '20px',
    padding: '10px 20px',
    fontSize: '18px',
    color: '#fff',
    backgroundColor: '#007bff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
});

const NotFound = () => {
  const classes = useStyles();
  const navigate = useNavigate();

  const handleNavigate = () => {
    navigate("/gioi-thieu");
  };

  return (
    <div className={classes.notFound}>
       <h1 className={classes.title}>404 - Không tìm thấy</h1>
       <p className={classes.message}>Trang bạn tìm không tồn tại.</p>
      <button className={classes.button} onClick={handleNavigate}>
        Quay lại trang chủ
      </button>
    </div>
  );
};

export default NotFound;
