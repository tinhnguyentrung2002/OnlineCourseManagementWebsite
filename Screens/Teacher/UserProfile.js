import React, { useEffect, useState, useRef } from "react";
import { db, storage } from "../../firebase";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  Badge,
  Button,
  Card,
  Form,
  Container,
  Row,
  Col,
} from "react-bootstrap";
import { CircularProgress } from "@mui/material";
import { useUser } from "../../context/UserContext";
import Image from "react-bootstrap/Image";
import defaultImage from "../../assets/profile.png";

function UserProfile() {
  const uid = useUser();
  const fileInputRef = useRef(null);
  const [userData, setUserData] = useState();
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [userName, setUserName] = useState("");
  const [userAboutMe, setUserAboutMe] = useState("");
  const [userFacebook, setUserFacebook] = useState("");
  const [userYoutube, setUserYoutube] = useState("");

  useEffect(() => {
    fetchUserData();
  }, [uid]);

  const fetchUserData = async () => {
    try {
      const userDoc = doc(db, "Users", uid);
      onSnapshot(userDoc, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData(data);
          setUserName(data.user_name || "");
          setUserAboutMe(data.user_about_me || "");
          setUserFacebook(data.user_facebook || "");
          setUserYoutube(data.user_youtube || "");
        } else {
          console.log("Lỗi truy xuất thông tin người dùng");
        }
      });
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu người dùng: ", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
        setFile(selectedFile);
        handleUpload(selectedFile);
    }
};

const handleUpload = async (fileToUpload) => {
    if (!fileToUpload) return;
    setLoading(true);
    const storageRef = ref(storage, `Users/Avatars/avatar_${uid}_${fileToUpload.name}`);
    
    try {
        await uploadBytes(storageRef, fileToUpload);
        const downloadURL = await getDownloadURL(storageRef);
        
        await updateDoc(doc(db, "Users", uid), {
            user_avatar: downloadURL,
        });

        setUserData((prevData) => ({ ...prevData, user_avatar: downloadURL }));
    } catch (error) {
        console.error("Lỗi khi tải lên:", error);
    } finally {
        setFile(null);
        setLoading(false);
    }
};
  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const isValidURL = (url) => {
    if (!url) {
        return true;
    }

    const pattern = /^(https?:\/\/)?(www\.)?(facebook\.com|youtube\.com|youtu\.be)\/.+$/;
    return pattern.test(url);
};
  const handleUpdate = async () => {
    setLoading(true)
    setTimeout(async ()=>{
      if (!userData) return;

      const updatedFields = {};
  
      if (userData.user_name !== userName) {
        updatedFields.user_name = userName;
      }
      if (userData.user_about_me !== userAboutMe) {
        updatedFields.user_about_me = userAboutMe;
      }
      if (userData.user_facebook !== userFacebook) {
        if (isValidURL(userFacebook)) {
          updatedFields.user_facebook = userFacebook;
        } else {
          alert("Link Facebook không hợp lệ.");
          setLoading(false)
          return;
        }
      }
      if (userData.user_youtube !== userYoutube) {
        if (isValidURL(userYoutube)) {
          updatedFields.user_youtube = userYoutube;
        } else {
          alert("Link YouTube không hợp lệ.");
          setLoading(false)
          return;
        }
      }
  
      if (Object.keys(updatedFields).length > 0) {
        await updateDoc(doc(db, "Users", uid), updatedFields);
        fetchUserData();
      }
        setLoading(false)
    },1000)
 
  };

  const getUserPermission = (permission) => {
    switch (permission) {
      case "0":
        return "Admin";
      case "2":
        return "Giáo viên";
      default:
        return "Chưa xác định";
    }
  };

  const formatTimestamp = (timestamp) => {
    if (timestamp && timestamp.seconds) {
      const date = new Date(timestamp.seconds * 1000);
      return date.toLocaleString();
    }
    return "Chưa có";
  };

  if (!userData) {
    return (
      <Container fluid className="text-center" style={{ marginTop: "20%" }}>
        <p>Không tìm thấy thông tin người dùng</p>
      </Container>
    );
  } else {
    return (
      <Container fluid>
        <Row>
          <Col>
            <Card>
              <Card.Header>
                <Card.Title as="h4">Thông tin người dùng</Card.Title>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md="6">
                    <Form.Group>
                      <label>ID người dùng</label>
                      <Form.Control
                        defaultValue={userData.user_uid || ""}
                        disabled
                        type="text"
                      />
                    </Form.Group>
                  </Col>
                  <Col md="6">
                    <Form.Group>
                      <label>Email</label>
                      <Form.Control
                        disabled
                        defaultValue={userData.user_email || ""}
                        placeholder="Email"
                        type="email"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md="6">
                    <Form.Group>
                      <label>Tên người dùng</label>
                      <Form.Control
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="Tên người dùng"
                        type="text"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md="12">
                    <Form.Group>
                      <label>Về tôi</label>
                      <Form.Control
                        cols="80"
                        value={userAboutMe}
                        onChange={(e) => setUserAboutMe(e.target.value)}
                        placeholder="Mô tả về bản thân"
                        rows="4"
                        as="textarea"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md="6">
                    <Form.Group>
                      <label>Link Facebook</label>
                      <Form.Control
                        value={userFacebook}
                        onChange={(e) => setUserFacebook(e.target.value)}
                        placeholder="Link Facebook"
                        type="text"
                      />
                    </Form.Group>
                  </Col>
                  <Col md="6">
                    <Form.Group>
                      <label>Link YouTube</label>
                      <Form.Control
                        value={userYoutube}
                        onChange={(e) => setUserYoutube(e.target.value)}
                        placeholder="Link YouTube"
                        type="text"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Button
                  className="btn-fill pull-right mt-3 mb-1"
                  type="button"
                  variant="info"
                  onClick={handleUpdate}
                >
                  Cập nhật hồ sơ
                </Button>
                <div className="clearfix"></div>
              </Card.Body>
            </Card>
          </Col>
          <Col md="5">
          <Card className="card-user">
            <div className="card-image" style={{ backgroundColor: '#0084FF' }}>
            </div>
            <Card.Body>
              {loading ? (
                <Container fluid className="text-center" style={{ marginTop: "20%", marginBottom: "20%" }}>
                  <CircularProgress />
                </Container>
              ) : (
                <>
                  <div className="author">
                    <Image
                      onClick={handleAvatarClick}
                      alt="Avatar"
                      className="avatar"
                      style={{ border: "2px solid black", borderRadius: "50%", objectFit: "cover" }}
                      src={userData.user_avatar || defaultImage}
                      roundedCircle
                    />
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      ref={fileInputRef}
                      onChange={handleFileChange}
                    />
                    <h5 className="title">{userData.user_name || "Không có tên"}</h5>
                    <p className="description">{userData.user_email || "Không có email"}</p>
                  </div>
                  <p className="description text-center">
                    "{userData.user_about_me || ""}"
                  </p>
                  <p className="text-center">
                    <Badge pill variant="info">
                      Đăng nhập lần cuối: {formatTimestamp(userData.user_lastLogin) || "Chưa có"}
                    </Badge>
                  </p>
                  <p className="text-center">
                    <Badge pill variant="success">
                      Vai trò: {getUserPermission(userData.user_permission) || "Chưa có"}
                    </Badge>
                  </p>
                </>
              )}
            </Card.Body>
            <Card.Footer className="text-center">
              {userData.user_facebook && (
                <a href={userData.user_facebook} target="_blank" rel="noopener noreferrer">
                  <i className="fab fa-facebook" style={{ fontSize: '30px', margin: '0 10px', color: '#3b5998' }} />
                </a>
              )}
              {userData.user_youtube && (
                <a href={userData.user_youtube} target="_blank" rel="noopener noreferrer">
                  <i className="fab fa-youtube" style={{ fontSize: '30px', margin: '0 10px', color: '#FF0000' }} />
                </a>
              )}
            </Card.Footer>
          </Card>
          </Col>
        </Row>
      </Container>
    );
  }
}

export default UserProfile;
