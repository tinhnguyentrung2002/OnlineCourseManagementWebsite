import React, { useState, useEffect } from 'react';
import { Button, TextField, Grid, Typography, Box, InputAdornment, CircularProgress, IconButton } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import { getDocs, collection, query, where, arrayRemove, getDoc, doc, updateDoc, deleteDoc, arrayUnion, serverTimestamp, writeBatch, orderBy} from 'firebase/firestore';
import { db } from '../firebase';
import { Image, Modal } from 'react-bootstrap';
import AlertPopup from './alert';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

const LearnerList = ({ courseId, courseMembers, fetchCourseData}) => {
  const [learners, setLearners] = useState([]);
  const [filteredLearners, setFilteredLearners] = useState([]);
  const [alert, setAlert] = useState({ message: '', severity: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loading1, setLoading1] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [openModal1, setOpenModal1] = useState(false);
  const [selectedUserUid, setSelectedUserUid] = useState(null);
  const [uidInput, setUidInput] = useState('');
  const [uidsArea, setUidsArea] = useState('');
  const [usersToAdd, setUsersToAdd] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  useEffect(() => {
    const fetchLearners = async () => {
      try {
        if(courseMembers.length != 0)
        {
            const usersRef = collection(db, "Users");
            const q = query(usersRef, where("user_uid", "in", courseMembers));
            const querySnapshot = await getDocs(q);
            const learnersData = querySnapshot.docs.map(doc => doc.data());
            await setLearners(learnersData);
            setFilteredLearners(learnersData);
            setLoading(false);
        }else{           
            await setLearners([]);
            setFilteredLearners([]);
            setLoading(false);
        }
        
      } catch (error) {
        console.error("Error fetching learners data: ", error);
        setLoading(false);
      }
    };
    fetchLearners();
  }, [courseMembers]);

  const handleSearch = (e) => {
    const value = e.target.value.toLowerCase();
    setSearchQuery(value);

    const filtered = learners.filter((learner) =>
      learner.user_uid.toLowerCase().includes(value) ||
      learner.user_name.toLowerCase().includes(value) ||
      learner.user_email.toLowerCase().includes(value)
    );
    setFilteredLearners(filtered);
  };
  const handleRemoveLearner = async (userUid) => {
    try {
      setLoading(true)
      const courseDocRef = doc(db, "Courses", courseId);
      await updateDoc(courseDocRef, {
        course_member: arrayRemove(userUid),
      });
  
      const ownCourseQuery = query(
        collection(db, "Users", userUid, "OwnCourses"),
        where("own_course_item_id", "==", courseId)
      );
      const ownCourseSnapshot = await getDocs(ownCourseQuery);

      ownCourseSnapshot.forEach(async (docSnapshot) => {
        const docRef = docSnapshot.ref;
        await deleteDoc(docRef); 
      });
      await fetchCourseData()
      setLoading(false)
    } catch (error) {
      console.error('Error removing learner: ', error);
    }
  };
  const handleSearchUser = async () => {
    try {
      setLoading1(true);
      if (uidInput.length !== 0) {
        const userCol = collection(db, "Users");
        const userQuery = query(
          userCol,
          where("user_permission", "==", "1"),
          where("user_uid", "==", uidInput) 
        );
 
        const querySnapshot = await getDocs(userQuery);
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          setUserInfo(userData);
        } else {
          setUserInfo(null);
        }
  
        setLoading1(false);
      } else {
        setUserInfo(null);
        setLoading1(false);
      }
    } catch (error) {
      console.error("Error fetching user data: ", error);
      setLoading1(false); 
    }
  };

  const isUserInList = (uid) => {
    return usersToAdd.some(user => user.user_uid === uid);
  };

  const isUserInCourse = async (uid) => {
    const courseDocRef = doc(db, "Courses", courseId);
    const courseDoc = await getDoc(courseDocRef);
    const courseData = courseDoc.data();
    return courseData && courseData.course_member.includes(uid);
  };

  const handleAddUserToList = async () => {
    if (userInfo) {
      if (isUserInList(userInfo.user_uid)) {
        setAlert({ message: "Học viên này đã có trong danh sách chuẩn bị thêm.", severity: "warning" });
        return;
      }
      const isInCourse = await isUserInCourse(userInfo.user_uid);
      if (isInCourse) {
        setAlert({ message: "Học viên này đã tham gia lớp học.", severity: "warning" });
        return;
      }

      setUsersToAdd([...usersToAdd, userInfo]);
      setUidInput('');
      setUserInfo(null);
    }
  };

  const handleAddUsersFromArea = async () => {
    setUidsArea('')
    const uids = uidsArea.split('\n').map(uid => uid.trim()).filter(uid => uid);
    const users = await Promise.all(
      uids.map(async (uid) => {
        try {          
          const userDocRef = doc(db, "Users", uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            return userDoc.data();
          } else {
            setAlert({ message: `Học viên ${uid} không tồn tại.`, severity: "warning" });
            return null;
          }
        } catch (error) {
          console.error(`Error fetching user ${uid}: `, error);
          return null;
        }
      })
    );
    users.forEach( async (user) => {
      if (user) {
        const isInCourse = await isUserInCourse(user.user_uid);
        if (!isUserInList(user.user_uid) && !isInCourse) {
          setUsersToAdd(prev => [...prev, user]);
        } else {
           setAlert({ message: `Có học viên đã tồn tại trong danh sách hoặc đã tham gia lớp học.`, severity: "warning" });
        }
      }
    });
  };
  
  const handleAddLearnersToClass = async () => {
    try {
      setLoading(true)
      const courseDocRef = doc(db, "Courses", courseId);
      await updateDoc(courseDocRef, {
        course_member: arrayUnion(...usersToAdd.map(user => user.user_uid)),
      }).then(()=>{
        setAlert({ message: "Thêm học viên thành công.", severity: "warning" });
      });
      const batch = writeBatch(db); 

      for (let user of usersToAdd) {
        const userDocRef = doc(db, "Users", user.user_uid);
        const ownCoursesCollectionRef = collection(userDocRef, "OwnCourses");
  
        const newOwnCourseDocRef = doc(ownCoursesCollectionRef);
        const ownCourseData = {
          own_course_complete: false,
          own_course_date: serverTimestamp(),
          own_course_ex_progress: "0",
          own_course_item_id: courseId,
          own_course_item_type: "class",
          own_course_progress: "0",
          own_course_video_progress: "0"
        };
  
        batch.set(newOwnCourseDocRef, ownCourseData);
        batch.update(newOwnCourseDocRef, {
          own_course_id: newOwnCourseDocRef.id
        });
      }
  
      await batch.commit();
      await fetchCourseData()
      handleCloseAddUserModal()
      setLoading(false)
    } catch (error) {
      console.error("Error adding learners to course: ", error);
    }
  };
  const handleRemoveUserFromList = (uid) => {
    setUsersToAdd(usersToAdd.filter(user => user.user_uid !== uid));
  };
  const handleOpenAddUserModal = () =>{
    setUserInfo(null)
    setUidInput('');
    setUserInfo(null);
    setOpenModal1(true)
    setUsersToAdd([])
    setUidsArea('')
    setAlert({ message: "", severity: "" });
  }
  const handleCloseAddUserModal = () =>{
    setOpenModal1(false)
  }
  const handleViewProgress = (userUid) => {
    setSelectedUserUid(userUid);
    setOpenModal(true);
  };
  const columns = [
    { field: 'id', headerName: 'STT', width: 100, sortable: true },
    {
      field: 'user_avatar',
      headerName: 'Avatar',
      width: 123,
      renderCell: (params) => ( 
        <img
          src={params.row.user_avatar || 'default-avatar.png'}
          alt="avatar"
          style={{ width: 40, height: 40, borderRadius: '50%' }}
        />
      ),
    },
    { field: 'user_name', headerName: 'Tên học viên', width: 205 },
    { field: 'user_email', headerName: 'Email', width: 290 },
    { field: 'user_uid', headerName: 'UID', width: 272 },
    {
      field: 'actions',
      headerName: 'Hành động',
      width: 300,
      renderCell: (params) => (
        <Box>
          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={() => handleViewProgress(params.row.user_uid)}
            style={{ marginRight: '8px' }}
          >
            Xem tiến độ
          </Button>
          <Button
            variant="contained"
            color="error"
            size="small"
            onClick={() => handleRemoveLearner(params.row.user_uid)}
          >
            Mời khỏi lớp
          </Button>
        </Box>
      ),
    },
  ];

  const rows = filteredLearners.map((learner, index) => ({
    id: index + 1,
    user_avatar: learner.user_avatar,
    user_name: learner.user_name,
    user_email: learner.user_email,
    user_uid: learner.user_uid,
  }));

  return (
    <div>
      <Grid container spacing={3} alignItems="center" justifyContent="space-between" marginTop={2}>
        <Grid item xs={8}>
          <TextField
            fullWidth
            variant="outlined"
            label="Tìm kiếm học viên"
            value={searchQuery}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item>
          <Button variant="contained" color="success" onClick={() => handleOpenAddUserModal()}>
            Thêm học viên
          </Button>
        </Grid>
      </Grid>

      <Typography variant="h6" gutterBottom style={{ marginTop: '20px' }}>
        Danh sách học viên
      </Typography>

      
        <div style={{ height: 400, width: '100%' }}>
        {loading ? (
        <CircularProgress className='text-center' />
      ) : (
          <DataGrid rows={rows} columns={columns} pageSize={5} rowsPerPageOptions={[5]} />   )}
           <Modal show={openModal1} onHide={()=>handleCloseAddUserModal()}>
           <AlertPopup alert={alert} setAlert={setAlert} />
            <Box sx={{ width: '500px', margin: 'auto', padding: 4, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 24 }}>
                <Typography variant="h6" gutterBottom>
                Thêm học viên vào khóa học
                </Typography>
                <TextField
                    label="Nhập UID"
                    fullWidth
                    value={uidInput}
                    onChange={(e) => setUidInput(e.target.value)}
                    onBlur={handleSearchUser}
                    variant="outlined"
                />
                {loading1 ? (
                <Box sx={{ textAlign: 'center', marginTop: 2 }}>
                    <CircularProgress />
                </Box>
                ) : userInfo ? (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                    <Typography style={{marginTop:8, marginLeft:1}} variant="body1">{userInfo.user_name} - {userInfo.user_email}</Typography>
                    <IconButton onClick={handleAddUserToList}>
                    <AddIcon />
                    </IconButton>
                </Box>
                ) : (
                <Typography variant="body2" sx={{ marginTop: 2, marginLeft:1 }}>
                    Không tìm thấy người dùng.
                </Typography>
                )}

                <TextField
                label="Dán nhiều UID vào đây (mỗi UID cách nhau 1 dòng)"
                multiline
                rows={4}
                fullWidth
                value={uidsArea}
                onChange={(e) => setUidsArea(e.target.value)}
                sx={{ marginTop: 4 }}
                />
                <Button
                variant="outlined"
                color="primary"
                sx={{ marginTop: 2 }}
                onClick={handleAddUsersFromArea}
                >
                Thêm toàn bộ
                </Button>

                {usersToAdd.length > 0 && (
                <Box sx={{ marginTop: 2 }}>
                    <Typography variant="body1">Danh sách học viên sẽ thêm:</Typography>
                    <Box>
                    <Typography variant="body1">Tổng số: {usersToAdd.length}</Typography>
                    {usersToAdd.map((user, index) => (
                        <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', marginTop: 1 }}>
                        <Typography style={{marginTop:8, marginLeft:1}} variant="body2">{index+1}. {user.user_name} </Typography>
                        <IconButton onClick={() => handleRemoveUserFromList(user.user_uid)} color="error">
                            <RemoveIcon />
                        </IconButton>
                        </Box>
                    ))}
                    </Box>
                </Box>
                )}

                <Box sx={{ textAlign: 'center', marginTop: 3 }}>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleAddLearnersToClass}
                    disabled={usersToAdd.length === 0 || loading}
                >
                    Thêm học viên
                </Button>
                </Box>
            </Box>
            </Modal>
        </div>
   
       <LearnerProgressModal open={openModal} onClose={() => setOpenModal(false)} userUid={selectedUserUid} courseId={courseId} />
    </div>
  );
};
const LearnerProgressModal = ({ open, onClose, userUid, courseId }) => {
    const [progress, setProgress] = useState(null);
    const [loading, setLoading] = useState(true);
    const [headingData, setHeadingData] = useState([]);
    const [courseDetails, setCourseDetails] = useState(null);
  
    useEffect(() => {
      if (open) {
        fetchUserProgress();
      }
    }, [open]);
  
    const fetchUserProgress = async () => {
      setLoading(true);
      try {
        const userDocRef = doc(db, "Users", userUid);
        const userDoc = await getDoc(userDocRef);
  
        if (!userDoc.exists()) {
          console.error("User not found");
          setLoading(false);
          return;
        }
  
        const userData = userDoc.data();
  
        const ownCourseQuery = query(
          collection(db, "Users", userUid, "OwnCourses"),
          where("own_course_item_id", "==", courseId)
        );
  
        const ownCourseSnapshot = await getDocs(ownCourseQuery);
        const progressData = ownCourseSnapshot.docs.map((doc) => doc.data());
        setCourseDetails({ userData, progressData });
  
        // const headingsQuery = query(
        //   collection(db, "Courses", courseId, "Heading"), 
        // );
        const headingsRef = collection(db, "Courses", courseId, "Heading");
        const q = query(headingsRef, orderBy("heading_order")); 
        const headingsSnapshot = await getDocs(q);
        const headings = [];
  
        for (const headingDoc of headingsSnapshot.docs) {
          const headingId = headingDoc.id;
          const headingTitle = headingDoc.data().heading_title;
          const videosRef = collection(
            db,
            "Courses",
            courseId,
            "Heading",
            headingId,
            "video"
          );
          const quizzesRef = collection(
            db,
            "Courses",
            courseId,
            "Heading",
            headingId,
            "quiz"
          );
  
          const videosSnapshot = await getDocs(videosRef);
          const quizzesSnapshot = await getDocs(quizzesRef);
  
          const videos = videosSnapshot.docs.map((doc) => doc.data().video_id);
          const quizzes = quizzesSnapshot.docs.map((doc) => doc.id);
  
          const videoProgress = await calculateVideoProgress(videos);
          const quizProgress = await calculateQuizProgress(quizzes, quizzesRef);
  
          headings.push({
            headingId,
            headingTitle,  
            videoProgress,
            quizProgress,
          });
        }
  
        setHeadingData(headings);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching user progress: ", error);
        setLoading(false);
      }
    };
  
    const calculateVideoProgress = async (videoIds) => {
      const videoProgress = await Promise.all(
        videoIds.map(async (videoId) => {
          const videoQuery = query(
            collection(db, "Users", userUid, "CheckVideo"),
            where("video_id", "==", videoId)
          );
          const videoSnapshot = await getDocs(videoQuery);
          return videoSnapshot.docs.length > 0 ? 1 : 0;
        })
      );
      return {
        total: videoIds.length,
        watched: videoProgress.reduce((sum, watched) => sum + watched, 0),
      };
    };
  
    const calculateQuizProgress = async (quizIds, quizzesRef) => {
      const quizProgress = await Promise.all(
        quizIds.map(async (quizId) => {
        const quizDocRef = doc(quizzesRef, quizId);
        const quizSnapshot1 = await getDoc(quizDocRef);
        const quizData1 = quizSnapshot1.data();
          const quizSnapshot = await getDoc(
            doc(db, "Users", userUid, "CheckQuiz", quizId)
          );
          const quizData = quizSnapshot.data();
          return {
            quizId,
            score: quizData ? quizData.quiz_best_score : 0,
            passed: quizData ? quizData.quiz_state : false,
            quizTitle: quizData1 ? quizData1.quiz_title : 'Chưa có tiêu đề',
          };
        })
      );
      return quizProgress;
    };
  
    if (loading) {
      return (
        <Modal show={open} onHide={onClose}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100vh",
            }}
          >
            <CircularProgress />
          </Box>
        </Modal>
      );
    }
  
    return (
      <Modal show={open} onHide={onClose} size="lg">
        <Box
          sx={{
            padding: 6,
            width: "100%",
            maxWidth: "1200px",
            margin: "auto",
            bgcolor: "background.paper",
            borderRadius: 4,
            boxShadow: 24,
          }}
        >
          <Typography
            variant="h4"
            sx={{
              textAlign: "center",
              marginBottom: 4,
              fontWeight: "bold",
              color: "primary.main",
            }}
          >
            Thông tin học viên
          </Typography>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} sm={4} textAlign="center">
                <Box
                sx={{
                    width: 100,
                    height: 100,
                    borderRadius: "50%",
                    overflow: "hidden",
                    margin: "0 auto",
                    border: "3px solid #ddd",
                }}
                >
                <img
                    src={courseDetails.userData.user_avatar}
                    alt="Avatar"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                </Box>
            </Grid>

            {/* Information */}
            <Grid item xs={12} sm={8}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant="body1">
                    <strong>Tên:</strong> {courseDetails.userData.user_name}
                </Typography>
                <Typography variant="body1">
                    <strong>Email:</strong> {courseDetails.userData.user_email}
                </Typography>
                <Typography variant="body1">
                    <strong>UID:</strong> {courseDetails.userData.user_uid}
                </Typography>
                </Box>
            </Grid>
            </Grid>
  
          <Typography variant="h5" sx={{ marginTop: 6, marginBottom: 2 }}>
            Tổng quan
          </Typography>
          {courseDetails.progressData.map((item, index) => (
            <Box
              key={index}
              sx={{
                padding: 3,
                borderBottom: "1px solid #ddd",
                borderRadius: 2,
                backgroundColor: "#f9f9f9",
                marginBottom: 2,
              }}
            >
              <Typography variant="body1">
                <strong>Tiến độ khóa học:</strong> {item.own_course_progress}%
              </Typography>
              <Typography variant="body1">
                <strong>Tiến độ bài giảng:</strong> {item.own_course_video_progress}%
              </Typography>
              <Typography variant="body1">
                <strong>Tiến độ bài tập:</strong> {item.own_course_ex_progress}%
              </Typography>
            </Box>
          ))}
  
          <Typography variant="h5" sx={{ marginTop: 6, marginBottom: 2 }}>
            Chi tiết
          </Typography>
          {headingData.map((heading, index) => (
            <Box
              key={index}
              sx={{
                marginBottom: 4,
                padding: 4,
                border: "1px solid #ddd",
                borderRadius: 2,
                backgroundColor: "#fff",
              }}
            >
              <Typography variant="h6" sx={{ marginBottom: 2 }}>
                <strong>{heading.headingTitle}</strong>
              </Typography>
              <Typography variant="body2" sx={{ marginBottom: 1 }}>
                <strong>Bài giảng:</strong> {heading.videoProgress.watched}/
                {heading.videoProgress.total}
              </Typography>
              <Typography variant="body2" sx={{ marginBottom: 1 }}>
                <strong>Bài kiểm tra:</strong>{" "}
                {heading.quizProgress.filter((quiz) => quiz.passed).length}/
                {heading.quizProgress.length}
              </Typography>
              <Box >
                <Typography variant="body2" sx={{ marginBottom: 1 }}>
                  <strong>Chi tiết bài kiểm tra:</strong>
                </Typography>
                {heading.quizProgress.map((quiz, idx) => (
                  <Typography
                    key={idx}
                    variant="body2"
                    sx={{
                      paddingLeft: 2,
                      marginBottom: 1,
                      color: quiz.passed ? "success.main" : "error.main",
                    }}
                  >
                    {quiz.quizTitle}: {quiz.score}%{" "}
                    {quiz.passed ? "(Đạt)" : "(Không đạt)"}
                  </Typography>
                ))}
              </Box>
            </Box>
          ))}
  
          <Box textAlign="center" sx={{ marginTop: 6 }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={onClose}
              sx={{
                padding: "10px 30px",
                fontSize: "16px",
                borderRadius: "8px",
              }}
            >
              Đóng
            </Button>
          </Box>
        </Box>
      </Modal>
    );
  };
  
export default LearnerList;
