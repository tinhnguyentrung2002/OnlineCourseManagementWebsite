import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import {
    MDBContainer,
    MDBRow,
    MDBCol,
    MDBCard,
    MDBCardBody,
    MDBInput,
    MDBCheckbox,
    MDBModal,
    MDBModalDialog,
    MDBModalContent,
    MDBModalHeader,
    MDBModalTitle,
    MDBModalBody,
    MDBModalFooter,
    MDBBtn,
} from 'mdb-react-ui-kit';
import {Form} from "react-bootstrap";
import { Helmet } from 'react-helmet';
import AlertPopup from '../Components/alert';
import ReCAPTCHA from 'react-google-recaptcha';
import { useNavigate } from 'react-router-dom';
import { Alert } from '@mui/material';

const Login = () => {
  const [email, setEmail] = useState('');
  const [emailModal, setEmailModal] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const authInstance = getAuth();
  const [staticModal, setStaticModal] = useState(false);
  const toggleOpen = () => setStaticModal(!staticModal);
  const recaptchaRef = React.useRef();
  const [alert, setAlert] = useState({ message: '', severity: '' });
  const navigate = useNavigate();



  const handleLogin = async (e) => {

    e.preventDefault();
    setError('');

    const token = await recaptchaRef.current.executeAsync();

    try {
      const userCredential = await signInWithEmailAndPassword(authInstance, email, password);
      const user = userCredential.user;
      if (!user.emailVerified) {
        await sendEmailVerification(user);
        setError(`Vui lòng kiểm tra email của bạn và xác thực. Link xác thực đã được gửi đến: ${email}`);
        setPassword("")
        await signOut(authInstance);
        return;
      } else {
        checkUserPermissions(userCredential.user.uid);
      }
    } catch (err) {
      setError('Đăng nhập không thành công. Vui lòng kiểm tra thông tin.');
      setPassword("");
      console.error(err);
    } finally {
      recaptchaRef.current.reset();
    }
  };

  const checkUserPermissions = async (uid) => {
    const usersRef = collection(db, 'Users');
    const q = query(usersRef, where('user_uid', '==', uid));
    const querySnapshot = await getDocs(q);

 
    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data();
      const userPermission = userData.user_permission;
      const userAccountState = userData.user_account_state;
      const userInfo = {
        uid: uid,
        permission: userPermission,
        state: userAccountState,
        loginSession: new Date().getTime(),
      };
      if(userAccountState === "ban") {
        setAlert({ open: true, message: 'Tài khoản đã bị khóa, vui lòng liên hệ admin@gmail.com', severity: 'warning' });
        return;
      }
      if (userPermission === "0") {
        
        localStorage.setItem('loginSession', JSON.stringify(userInfo));
        setAlert({ open: true, message: 'Đăng nhập thành công!', severity: 'success' });
        setTimeout(() => {setAlert({ message: '', severity: '' });  
        navigate("/admin/dashboard"); }, 1000);

      } else if (userPermission === "2") {
        localStorage.setItem('loginSession', JSON.stringify(userInfo));
        setTimeout(() => {setAlert({ message: '', severity: '' });  
        navigate("/giao-vien/dashboard"); }, 1000);
     

      } else {
        setError('Bạn không có quyền truy cập.');
        setPassword("");
        await signOut(authInstance);
      }
    } else {
      setAlert({ message: 'Lỗi quyền truy cập', severity: 'error' });
      setPassword("");
      await signOut(authInstance);
    }
  };

  const handlePasswordReset = async () => {
    const token = await recaptchaRef.current.executeAsync();

    try {
      await sendPasswordResetEmail(auth, emailModal);
      setAlert({ message: 'Link reset mật khẩu đã được gửi tới ' + emailModal, severity: 'success' });
      setEmailModal(null);
      toggleOpen();
    } catch (error) {
      setAlert({ message: error.message, severity: 'error' });
      toggleOpen();
    } finally {
      recaptchaRef.current.reset();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin(e);
    }
  };

  return (
<div style={{ backgroundColor: '#006666', height: '100vh', display: 'flex', alignItems: 'center' }}>
  <MDBContainer fluid className="h-100">
    <Helmet>
      <title>Đăng nhập</title>
    </Helmet>
    <AlertPopup alert={alert} setAlert={setAlert} />
    <MDBRow className='d-flex justify-content-center align-items-center h-100'>
      <MDBCol col='12' md='6' lg='4'>
        <MDBCard className='bg-white my-5 mx-auto' style={{ borderRadius: '1rem', maxWidth: '500px' }}>
          <MDBCardBody className='p-5 w-100 d-flex flex-column'>
            <h2 className="fw-bold mb-2 text-center">Đăng nhập</h2>

            {error && (
                  <Alert 
                    severity="error" 
                    style={{ marginBottom: '20px' }}
                  >
                    {error}
                  </Alert>
                )}

            <Form.Group className="mb-3">
              <label htmlFor="emailInput">Tài khoản</label>
              <Form.Control
                id="emailInput"
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={handleKeyPress}
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <label htmlFor="passwordInput">Mật khẩu</label>
              <Form.Control
                id="passwordInput"
                placeholder="Mật khẩu"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
              />
            </Form.Group>

            <h4 style={{ fontSize: 12, cursor: 'pointer'}}
                onClick={toggleOpen}
                className="mb-4 w-100 text-end">
              Quên mật khẩu?
            </h4>

            <MDBModal staticBackdrop tabIndex='-1' open={staticModal} onClose={() => setStaticModal(false)}>
              <MDBModalDialog>
                <MDBModalContent>
                  <MDBModalHeader>
                    <MDBModalTitle>Reset mật khẩu</MDBModalTitle>
                    <MDBBtn className='btn-close' color='none' onClick={toggleOpen}></MDBBtn>
                  </MDBModalHeader>
                  <MDBModalBody>
                    <MDBInput
                      style={{ marginTop: 8 }}
                      type="email"
                      label="Nhập email cần reset mật khẩu"
                      value={emailModal}
                      onChange={(e) => setEmailModal(e.target.value)}
                    />
                  </MDBModalBody>
                  <MDBModalFooter>
                    <MDBBtn color='secondary' onClick={toggleOpen}>
                      Đóng
                    </MDBBtn>
                    <MDBBtn onClick={handlePasswordReset}>Gửi email reset</MDBBtn>
                  </MDBModalFooter>
                </MDBModalContent>
              </MDBModalDialog>
            </MDBModal>

            <ReCAPTCHA
              ref={recaptchaRef}
              size="invisible"
              sitekey="6LcwUGMqAAAAABOGbv5wjbQxnfYoIRXB0tTPIrEd"
            />

            <MDBBtn style={{backgroundColor:'#1A63C2', color:'white'}} size='lg' onClick={handleLogin}>
              Đăng nhập
            </MDBBtn>
          </MDBCardBody>
        </MDBCard>
      </MDBCol>
    </MDBRow>
  </MDBContainer>
</div>

  
  );
};

export default Login;
