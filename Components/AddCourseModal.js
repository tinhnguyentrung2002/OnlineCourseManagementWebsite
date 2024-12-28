import React, { useState, useEffect } from "react";
import { Modal, Form, Button } from "react-bootstrap";
import { collection, addDoc, serverTimestamp, updateDoc, doc, getDoc, getDocs, where, query } from "firebase/firestore";
import { db, storage } from "../firebase.js";
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Timestamp } from "firebase/firestore";
import { useUser } from "../context/UserContext.js";
const AddCourseModal = ({ show, handleClose, onCourseAdded, type}) => {
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [courseGrade, setCourseGrade] = useState('10');
  const [coursePrice, setCoursePrice] = useState(0);
  const [courseTotalTime, setCourseTotalTime] = useState(0);
  const [courseStartTime, setCourseStartTime] = useState('');
  const [courseEndTime, setCourseEndTime] = useState('');
  const [courseImage, setCourseImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [levels, setLevels] = useState([]);
  const [copies, setCopies] = useState([]);
  const [selectedCopy, setSelectedCopy] = useState('');
  const uid = useUser();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesRef = collection(db, "Categories");
        const q = query(categoriesRef, where("category_id", "not-in", ["grade10", "grade11", "grade12"]));
        const categorySnapshot = await getDocs(q);
        const categoryList = categorySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCategories(categoryList);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    const fetchCopies = async () => {
      try {
      
        const copiesRef = collection(db, "Copies");
        const q = query(
          copiesRef,
          where("copy_user_id", "==", uid) 
        );
        const copySnapshot = await getDocs(q);
        const copyList = copySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          copy_upload: doc.data().copy_upload ? new Date(doc.data().copy_upload.seconds * 1000).toLocaleString() : ""
        }));
   
        setCopies(copyList);
      } catch (error) {
        console.error("Error fetching copies:", error);
      }
    };
    

    fetchCopies();
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchLevels = async () => {
      if (selectedCategory) {
        try {
          const levelsSnapshot = await getDocs(collection(db, 'Categories', selectedCategory, 'CategoriesChild'));
          const levelList = levelsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));

          setLevels(levelList)
        } catch (error) {
          console.error("Error fetching levels:", error);
        }
      }
    };

    fetchLevels();
  }, [selectedCategory]);

  const handleImageChange = (e) => {
    setCourseImage(e.target.files[0]);
  };
  const generateRandomPassword = (length) => {
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_-+=<>?";
    var password = "";
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset[randomIndex];
    }
    return password;
  }
  
  const generateRandomString = (length) => {
    const charset = "0123456789";
    let randomString = "Copy#";
  
    for (let i = 0; i < length - 5; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      randomString += charset[randomIndex];
    }
  
    return randomString;
  }
  const handleSubmit = async () => {
    setLoading(true);

    if (!selectedCopy) {
      if (!courseTitle || !courseDescription || !courseImage || !selectedCategory || !selectedLevel) {
        alert("Vui lòng điền đầy đủ thông tin và chọn ảnh.");
        setLoading(false);
        return;
      }
      if(type === "course")
      {
        if (coursePrice <= 0) {
          alert("Giá khóa học phải lớn hơn 0.");
          setLoading(false);
          return;
        }
  
        if (type === "course" && courseTotalTime < 1) {
          alert("Thời gian khóa học phải lớn hơn hoặc bằng 1.");
          setLoading(false);
          return;
        }
      }

      if (type === "class" && (!courseStartTime || !courseEndTime)) {
        alert("Vui lòng nhập thời gian bắt đầu và kết thúc.");
        setLoading(false);
        return;
      }
      
      if (type === "class" && (new Date(courseStartTime).getTime() >= new Date(courseEndTime).getTime())) {
        alert("Thời gian kết thúc phải sau thời gian bắt đầu.");
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "Users", uid));
        const userName = userDoc.exists() ? userDoc.data().user_name : "Unknown";

        const timestamp = Date.now();
        const extension = courseImage.name.split('.').pop();
        const fileName = `${courseImage.name.split('.').slice(0, -1).join('.')}_${timestamp}.${extension}`;

        const storageRef = ref(storage, `Courses/Thumbnails/${fileName}`);
        await uploadBytes(storageRef, courseImage);

        const imageUrl = await getDownloadURL(storageRef);

        const courseData = {
          course_title: courseTitle,
          course_description: courseDescription,
          course_grade: Number(courseGrade),
     

          course_upload: serverTimestamp(),
          course_img: imageUrl,
          course_owner_id: uid,
          course_owner: userName,
        };

        if (type === "course") {
          courseData.course_price = coursePrice;
          courseData.course_rate = 0;
          courseData.course_member = 0;
          courseData.course_state = false;
          courseData.course_type = "course";
          courseData.course_total_time = courseTotalTime;
          const docRef = await addDoc(collection(db, "TempCourses"), courseData);

          await updateDoc(docRef, {
            course_id: docRef.id,
          }).then( async ()=>{
            const typeRef = collection(db, "TempCourses", docRef.id, "Type");
            const doc = await addDoc(typeRef, {
              category_id: selectedCategory,
              category_child_id: "",
              course_id: docRef.id,
            });
            await updateDoc(doc, {
              type_id: doc.id,
            });
        
            const doc1 = await addDoc(typeRef, {
              category_id: selectedCategory,
              category_child_id: selectedLevel,
              course_id: docRef.id,
            });
            await updateDoc(doc1, {
              type_id: doc1.id,
            });
        
            const gradeId = `grade${courseGrade}`;
            const doc2 = await addDoc(typeRef, {
              category_id: gradeId,
              category_child_id: "",
              course_id: docRef.id,
            });
            await updateDoc(doc2, {
              type_id: doc2.id,
            });
          });
        } else {
          courseData.course_private_key = generateRandomPassword(8);
          courseData.course_state = true;
          courseData.course_type = "class";
          courseData.course_member = new Array();
          courseData.course_recommend = new Array();
          courseData.course_start_time = Timestamp.fromDate(new Date(courseStartTime));
          courseData.course_end_time = Timestamp.fromDate(new Date(courseEndTime));
          const docRef = await addDoc(collection(db, "Courses"), courseData);

          await updateDoc(docRef, {
            course_id: docRef.id,
          }).then( async ()=>{
            const typeRef = collection(db, "Courses", docRef.id, "Type");
            const doc = await addDoc(typeRef, {
              category_id: selectedCategory,
              category_child_id: "",
              course_id: docRef.id,
            });
            await updateDoc(doc, {
              type_id: doc.id,
            });
        
            const doc1 = await addDoc(typeRef, {
              category_id: selectedCategory,
              category_child_id: selectedLevel,
              course_id: docRef.id,
            });
            await updateDoc(doc1, {
              type_id: doc1.id,
            });
        
            const gradeId = `grade${courseGrade}`;
            const doc2 = await addDoc(typeRef, {
              category_id: gradeId,
              category_child_id: "",
              course_id: docRef.id,
            });
            await updateDoc(doc2, {
              type_id: doc2.id,
            });
          });
        }
       

        setLoading(false);
        onCourseAdded("success", "Khóa học đã được thêm thành công!");
        handleClose();
        resetForm();
      } catch (error) {
        setLoading(false);
        handleClose();
        resetForm();
        onCourseAdded("error", "Đã xảy ra lỗi. Vui lòng thử lại");
        console.log(error)
      }
    } else {
      try {
        const copyDoc = await getDoc(doc(db, "Copies", selectedCopy), where("copy_user_id", "==", uid));
        if (!copyDoc.exists()) {
          alert("Bản sao không tồn tại.");
          setLoading(false);
          return;
        }

        const copyData = copyDoc.data();
        
        const newCourseData = {
          ...copyData,
          course_title: copyData.course_title + "(" + generateRandomString(10) + ")",
          course_state: true,
          course_private_key: generateRandomPassword(8),
          course_upload: serverTimestamp(),
          course_member: [],
        };
        
        delete newCourseData.copy_id;
        delete newCourseData.copy_user_id;
        delete newCourseData.copy_name;
        delete newCourseData.copy_upload;
        
        const docRef = await addDoc(collection(db, "Courses"), newCourseData);
        
        await updateDoc(docRef, {
          course_id: docRef.id,
        });
        
        
        const typeRef = collection(db, "Copies", selectedCopy, "Type");
        const headingRef = collection(db, "Copies", selectedCopy, "Heading");
        
        const typeSnapshot = await getDocs(typeRef);
        const headingSnapshot = await getDocs(headingRef);

        const newTypeRef = collection(db, "Courses", docRef.id, "Type");
        typeSnapshot.forEach(async (typeDoc) => {
          const typeData = typeDoc.data();
          await addDoc(newTypeRef, typeData);
        });
        const newHeadingRef = collection(db, "Courses", docRef.id, "Heading");
        headingSnapshot.forEach(async (headingDoc) => {
          const headingData = headingDoc.data();
          const newHeadingDocRef = await addDoc(newHeadingRef, headingData);
        
          const subHeadingCollections = ['quiz', 'document', 'video'];
        
          for (let subCollection of subHeadingCollections) {
            const subCollectionRef = collection(db, "Copies", selectedCopy, "Heading", headingDoc.id, subCollection);
            const subCollectionSnapshot = await getDocs(subCollectionRef);
        
            subCollectionSnapshot.forEach(async (subDoc) => {
              const subDocData = subDoc.data();
              const newSubCollectionRef = collection(db, "Courses", docRef.id, "Heading", newHeadingDocRef.id, subCollection);
              const newSubDocRef = await addDoc(newSubCollectionRef, subDocData);
        
              if (subCollection === 'quiz') {
                const questionsRef = collection(db, "Copies", selectedCopy, "Heading", headingDoc.id, "quiz", subDoc.id, "questions");
                const questionsSnapshot = await getDocs(questionsRef);
        
                questionsSnapshot.forEach(async (questionDoc) => {
                  const questionData = questionDoc.data();
                  const newQuestionsRef = collection(db, "Courses", docRef.id, "Heading", newHeadingDocRef.id, "quiz", newSubDocRef.id, "questions");
                  await addDoc(newQuestionsRef, questionData);
                });
              }
            });
          }
        });
          
        resetForm();
        setLoading(false);
        onCourseAdded("success", "Khóa học đã được thêm từ bản sao thành công!");
        handleClose();
      } catch (error) {
        setLoading(false);
        handleClose();
        resetForm();
        onCourseAdded("error", "Đã xảy ra lỗi. Vui lòng thử lại.");
      }
    }
  };
  const resetForm = () =>{
        setCourseTitle('');
        setCourseDescription('');
        setCourseGrade('10');
        setCoursePrice(0);
        setCourseTotalTime(0);
        setCourseStartTime('');
        setCourseEndTime('');
        setCourseImage(null);
        setSelectedCategory('');
        setSelectedLevel('');
        setLevels([]);
        setSelectedCopy('');
        // setCopies([]);
  }
  return (
    <Modal show={show} onHide={()=>{resetForm();handleClose()} } size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{type === "course" ?"Thêm khóa học" :"Thêm lớp học"}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          {type === "class"? <Form.Group controlId="copySelect" className="mt-2">
            <Form.Label>Nhập thông tin từ bản sao</Form.Label>
            <Form.Select
              value={selectedCopy}
              onChange={(e) => setSelectedCopy(e.target.value)}
            >
              <option value="">Chọn bản sao</option>
              {copies.map((copy) => (
                <option key={copy.id} value={copy.id}>
                  {copy.copy_name} - {copy.copy_upload}
                </option>
              ))}
            </Form.Select>
          </Form.Group> : <></>}
        
          {!selectedCopy && (
            <>
          <Form.Group controlId="courseTitle">
            <Form.Label>{type === "course" ?"Tên khóa học" :"Tên lớp học"}</Form.Label>
            <Form.Control 
              type="text" 
              placeholder="Nhập tên khóa học" 
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)} 
            />
          </Form.Group>

          <Form.Group controlId="courseDescription" className="mt-2">
            <Form.Label>{type === "course" ?"Mô tả khóa học" :"Mô tả lớp học"} </Form.Label>
            <Form.Control 
              as="textarea" 
              rows={5} 
              placeholder="Nhập mô tả" 
              value={courseDescription}
              onChange={(e) => setCourseDescription(e.target.value)} 
            />
          </Form.Group>

          <Form.Group controlId="courseGrade" className="mt-2">
            <Form.Label>Khối lớp</Form.Label>
            <Form.Select
              value={courseGrade}
              onChange={(e) => setCourseGrade(e.target.value)}
            >
              <option value="10">Khối 10</option>
              <option value="11">Khối 11</option>
              <option value="12">Khối 12</option>
            </Form.Select>
          </Form.Group>

          <Form.Group controlId="courseCategory" className="mt-2">
            <Form.Label>Môn học</Form.Label>
            <Form.Select 
              value={selectedCategory} 
              defaultValue={""}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">Chọn môn học</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.category_title}</option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group controlId="courseLevel" className="mt-2">
            <Form.Label>Cấp độ</Form.Label>
            <Form.Select 
              value={selectedLevel} 
              onChange={(e) => setSelectedLevel(e.target.value)}
            >
              <option value="">Chọn cấp độ</option>
              {levels.map((level) => (
                <option key={level.id} value={level.id}>{level.category_title}</option>
              ))}
            </Form.Select>
          </Form.Group>

          {type === "course" && (
            <Form.Group controlId="coursePrice" className="mt-2">
              <Form.Label>Giá khóa học (lớn hơn 0)</Form.Label>
              <Form.Control 
                type="number"
                min={0} 
                placeholder="Nhập giá khóa học" 
                value={coursePrice}
                onChange={(e) => setCoursePrice(Number(e.target.value))} 
              />
            </Form.Group>
          )}

          {type === "course" ? (
            <Form.Group controlId="courseTotalTime" className="mt-2">
              <Form.Label>Thời gian tổng khóa học (giờ)</Form.Label>
              <Form.Control 
                type="number" 
                placeholder="Nhập thời gian tổng (Từ giá trị 1 trở lên)" 
                min={1}
                value={courseTotalTime}
                onChange={(e) => setCourseTotalTime(Number(e.target.value))} 
              />
            </Form.Group>
          ) : (
            <>
              <Form.Group controlId="courseStartTime" className="mt-2">
                <Form.Label>Thời gian bắt đầu</Form.Label>
                <Form.Control 
                  type="datetime-local" 
                  value={courseStartTime}
                  onChange={(e) => setCourseStartTime(e.target.value)} 
                />
              </Form.Group>
              <Form.Group controlId="courseEndTime" className="mt-2">
                <Form.Label>Thời gian kết thúc</Form.Label>
                <Form.Control 
                  type="datetime-local" 
                  value={courseEndTime}
                  onChange={(e) => setCourseEndTime(e.target.value)} 
                />
              </Form.Group>
            </>
          )}

          <Form.Group controlId="courseImage" className="mt-2">
            <Form.Label>{type === "course" ?"Hình ảnh khóa học" :"Hình ảnh lớp học"}</Form.Label>
            <Form.Control 
              type="file" 
              accept="image/*"
              onChange={handleImageChange} 
            />
          </Form.Group>
          </>
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer className="d-flex justify-content-end mt-3">
        <Button 
          type="submit" 
          onClick={handleSubmit}
          disabled={loading}
          variant="primary" 
          className="mt-3 ml-auto"
        >
          <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-plus'}`} />
          {loading ? ' Đang thêm...' : ' Xác nhận thêm'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AddCourseModal;
