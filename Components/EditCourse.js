import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Accordion, Modal, Alert } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, updateDoc, doc, addDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import AlertPopup from './alert';
import HeadingManagerModal from '../Components/HeadingManagerModal';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';


const EditCourse = ({ temp }) => {
    const { courseId } = useParams();
    const [courseData, setCourseData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loading1, setLoading1] = useState(false);
    const [courseImage, setCourseImage] = useState(null);
    const [alert, setAlert] = useState({ message: '', severity: '' });
    const [showModal, setShowModal] = useState(false);
    const [headings, setHeadings] = useState(null);
    const [newHeading, setNewHeading] = useState({ title: '', description: '', id: '', isEditing: false });
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const [headingToDelete, setHeadingToDelete] = useState(null);
    const [categories, setCategories] = useState([]);
    const [categoryChildren, setCategoryChildren] = useState([]);
    const [defaultCategoryId, setDefaultCategoryId] = useState(null);
    const [defaultCategoryChildId, setDefaultCategoryChildId] = useState(null);

    const navigate = useNavigate();
    useEffect(() => {
     fetchCourseData();   
    }, [courseId]);
    const handleInputChange = (e) => {
      const { name, value } = e.target;
      setCourseData(prevData => ({ ...prevData, [name]: value }));
    };
    const fetchCourseData = async () => {
      try {
        const courseCollectionRef = collection(db, getCollectionPath());
        const q = query(courseCollectionRef, where("course_id", "==", courseId));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          const fetchedCourse = {
            course_id: doc.id,
            ...doc.data(),
          };
          fetchedCourse.Heading = await fetchHeadings(doc.ref);
          fetchedCourse.Type = await fetchSubCollection('Type', doc.ref);
        
          setCourseData(fetchedCourse);
          setHeadings(fetchedCourse.Heading || []);
          fetchData(fetchedCourse.course_id);
            
        
        } else {
          setError("Khóa học không tồn tại");
        }
      } catch (err) {
        setError("Có lỗi xảy ra khi lấy dữ liệu khóa học: " + err.message);
      }
    };
  
    const fetchSubCollection = async (subCollectionName, docRef) => {
      const subCollectionRef = collection(docRef, subCollectionName);
      const subCollectionSnapshot = await getDocs(subCollectionRef);
      return subCollectionSnapshot.docs.map(subDoc => ({ id: subDoc.id, ...subDoc.data() }));
    };
  
    const fetchHeadings = async (courseRef) => {
      const headings = await fetchSubCollection('Heading', courseRef);
      headings.sort((a, b) => a.heading_order - b.heading_order);
      
      for (let heading of headings) {
        const headingRef = doc(db, getCollectionPath(), courseRef.id, "Heading", heading.id);
        heading.document = await fetchSubCollection('document', headingRef);
        heading.video = await fetchSubCollection('video', headingRef);
        heading.quiz = await fetchSubCollection('quiz', headingRef);
  
        heading.video.sort((a, b) => a.video_upload_date.toMillis() - b.video_upload_date.toMillis());
        heading.document.sort((a, b) => a.document_upload_date.toMillis() - b.document_upload_date.toMillis());
      
        for (let quiz of heading.quiz) {
          const quizRef = doc(db, getCollectionPath(), courseRef.id, "Heading", heading.id, "quiz", quiz.id);
          quiz.question = await fetchSubCollection('questions', quizRef);
        }
      }
      return headings;
    };
  
    const handleImageChange = (e) => {
      setCourseImage(e.target.files[0]);
    };
  
    const getCollectionPath = () => (temp === 0 ? "Courses" : "TempCourses");
  
    const handleUpdate = async (e) => {
      e.preventDefault();
      setLoading(true);

      try {
        if (!courseData || !courseData.course_id) {
          throw new Error("Khóa học không tồn tại hoặc ID không hợp lệ");
        }
  
        const courseRef = doc(db, getCollectionPath(), courseData.course_id);
  
        await updateDoc(courseRef, {
          course_title: courseData.course_title,
          course_description: courseData.course_description,
          course_grade: Number(courseData.course_grade),
          course_price: Number(courseData.course_price),
          course_total_time: Number(courseData.course_total_time),
        })
        handleGradeChange(courseData.course_id, Number(courseData.course_grade));
        handleCategoryChange(courseData.course_id, courseData.course_category_id || defaultCategoryId)
        updateType(courseData.course_id, courseData.course_category_id || defaultCategoryId, courseData.course_level || defaultCategoryChildId);
        if (courseImage) {
          const timestamp = Date.now();
          const extension = courseImage.name.split('.').pop();
          const fileName = `${courseImage.name.split('.').slice(0, -1).join('.')}_${timestamp}.${extension}`;
  
          const storageRef = ref(storage, `${getCollectionPath()}/Thumbnails/${fileName}`);
          await uploadBytes(storageRef, courseImage);
          const imageUrl = await getDownloadURL(storageRef);
  
          await updateDoc(courseRef, {
            course_img: imageUrl,
          }).then(()=>{
            setCourseData("")
            fetchCourseData()
          });
        }
     
      } catch (err) {
        setError("Có lỗi xảy ra khi cập nhật khóa học: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    const handleGradeChange = async (courseId, newGrade) => {
      try {
        const courseDocRef = doc(db, getCollectionPath(), courseId);
        await updateDoc(courseDocRef, { course_grade: newGrade });
    
        let newCategoryId = "";
        if (newGrade === 10) {
          newCategoryId = "grade10";
        } else if (newGrade === 11) {
          newCategoryId = "grade11";
        } else if (newGrade === 12) {
          newCategoryId = "grade12";
        }
    
  
        const typeCollectionRef = collection(db, getCollectionPath(), courseId, "Type");
        const q = query(typeCollectionRef, where("category_id", "in", ["grade10", "grade11", "grade12"]));
        const typeQuerySnapshot = await getDocs(q);
  
        if (!typeQuerySnapshot.empty) {
          typeQuerySnapshot.forEach(async (doc) => {
            const typeDocRef = doc.ref;
            await updateDoc(typeDocRef, { category_id: newCategoryId });
          });
        } else {
          console.log("Lỗi");
        }
    
      } catch (error) {

      }
    };
    const handleEditHeading = async () => {
      try {
      
        if (!newHeading.id) {
          throw new Error('ID của heading không hợp lệ');
        }
        if(newHeading.title === "" || newHeading.description === "")
          {
            setAlert({ message: "Vui lòng nhập đầy đủ thông tin", severity: "warning" });
            return;  
          }
        const headingRef = doc(db, getCollectionPath(), courseId, "Heading", newHeading.id);
        await updateDoc(headingRef, {
          heading_title: newHeading.title,
          heading_description: newHeading.description,
        }).then(async ()=>{
          if (!Array.isArray(courseData.Heading) || courseData.Heading.length === 0) {
            throw new Error('Dữ liệu Heading không hợp lệ');
          }
          const updatedHeadings = courseData.Heading
            .map(h => {
              if (h.id === newHeading.id) {
                return { ...h, heading_title: newHeading.title, heading_description: newHeading.description };
              }
              return h;
            })
            .sort((a, b) => a.heading_order - b.heading_order);
      
          if (!updatedHeadings.some(h => h.id === newHeading.id)) {
            throw new Error('Không tìm thấy heading cần cập nhật');
          }
      
          setHeadings(updatedHeadings);
          resetNewHeading();
          setShowModal(false);
          setAlert({ message: "Cập nhật chương thành công", severity: "success" });
        })
      } catch (error) {
        setAlert({ message: "Có lỗi xảy ra khi cập nhật chương: " + error.message, severity: "danger" });
      }
    };
    const deleteSubcollectionDocs = async (docRef, subcollectionName) => {
      const subcollectionRef = collection(docRef, subcollectionName);
      const snapshot = await getDocs(subcollectionRef);
      const deletePromises = snapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
      await Promise.all(deletePromises); 
    };
  
    const deleteDocumentWithSubcollections = async (docRef, subcollectionNames) => {
      try {
  
        for (const subcollectionName of subcollectionNames) {
          await deleteSubcollectionDocs(docRef, subcollectionName);
        }
        await deleteDoc(docRef);
        console.log('Đã xóa');
      } catch (error) {
        console.error('Lỗi khi xóa tài liệu', error);
      }
    };
    const handleConfirmDelete = async () => {
      if (headingToDelete) {
        try {
          setLoading1(true)
          const headingRef = doc(db, getCollectionPath(), courseData.course_id, "Heading", headingToDelete);
          const sub = ['document', 'video', 'quiz']
          await deleteDocumentWithSubcollections(headingRef, sub)
          const updatedHeadings = courseData.Heading.filter(h => h.id !== headingToDelete);
          setHeadings(updatedHeadings);
          setAlert({ message: "Xóa chương thành công", severity: "success" });
         
        } catch (error) {
          setAlert({ message: "Có lỗi xảy ra khi xóa chương: " + error.message, severity: "danger" });
        } finally {
          setShowConfirmDelete(false);
          await fetchCourseData()
          setLoading1(false)
        }
      }
    };
  
    const handleDeleteHeading = (id) => {
      setHeadingToDelete(id);
      setShowConfirmDelete(true);
    };
  
    const handleShowEditModal = (heading) => {
      fetchCourseData()
      setNewHeading({ title: heading.heading_title, description: heading.heading_description, id: heading.id, isEditing: true });
      setShowModal(true);
    };
  
    const handleShowAddModal = () => {
      resetNewHeading();
      setShowModal(true);
    };
  
    const handleDragEnd = async (result) => {
      if (!result.destination) return;
      const updatedHeadings = Array.from(headings);
      const [movedItem] = updatedHeadings.splice(result.source.index, 1);
      updatedHeadings.splice(result.destination.index, 0, movedItem);
  
      const newHeadingsWithOrder = updatedHeadings.map((heading, index) => ({
        ...heading,
        heading_order: index + 1,
      }));
  
      await Promise.all(newHeadingsWithOrder.map((heading) => {
        const headingRef = doc(db, getCollectionPath(), courseId, "Heading", heading.id);
        return updateDoc(headingRef, { heading_order: heading.heading_order }).then(()=>{
          setHeadings(newHeadingsWithOrder);
        });
      }));
    
    };
  
    const handleAddHeading = async () => {
      const headingOrder = headings.length ? Math.max(...headings.map(h => h.heading_order)) + 1 : 1;
  
      try {
        if(newHeading.title === "" || newHeading.description === "")
        {
          setAlert({ message: "Vui lòng nhập đầy đủ thông tin", severity: "warning" });
          return;  
        }
        const headingData = {
          course_id: courseData.course_id,
          heading_title: newHeading.title,
          heading_description: newHeading.description,
          heading_order: headingOrder,
        };
        const headingRef = await addDoc(collection(db, getCollectionPath(), courseId, "Heading"), headingData)
        await updateDoc(headingRef, {
          heading_id: headingRef.id,
        }).then(()=>{
          const newHeadingData = { id: headingRef.id, heading_title: newHeading.title, heading_description: newHeading.description, heading_order: headingOrder };
          setHeadings([...headings, newHeadingData].sort((a, b) => a.heading_order - b.heading_order));
          resetNewHeading();
          setAlert({ message: "Thêm chương thành công", severity: "success" });
        })
      } catch (error) {
        setAlert({ message: "Có lỗi xảy ra khi thêm chương" , severity: "danger" });
      }
    };
  
    const resetNewHeading = () => {
      setNewHeading({ title: '', description: '', id: '', isEditing: false });
      setShowModal(false);
    };
    const handleCategoryChange = async (courseId, selectedCategoryId) => {
      try {
        const typeCollectionRef = collection(db, getCollectionPath(), courseId, "Type");
        const q = query(typeCollectionRef, where("category_child_id", "==", ""), where("category_id", "not-in", ["grade10", "grade11", "grade12"]));
        const typeQuerySnapshot = await getDocs(q);
    
        if (!typeQuerySnapshot.empty) {
          typeQuerySnapshot.forEach(async (docSnapshot) => {
            const typeDocRef = doc(db, getCollectionPath(), courseId, "Type", docSnapshot.id);
            await updateDoc(typeDocRef, { category_id: selectedCategoryId });
          });
        } else {
          console.log("No matching Type document found for this course.");
        }
      } catch (error) {
        console.error("Error updating category_id in Type collection: ", error);
      }
    };
    const fetchCategories = async () => {
      const categoriesRef = collection(db, "Categories");
      const q = query(categoriesRef, where("category_id", "not-in", ["grade10", "grade11", "grade12"]));
      const querySnapshot = await getDocs(q);
    
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().category_title,
      }));
    };

    const fetchCategoryChildren = async (categoryId) => {
      const categoriesChildRef = collection(db, "Categories", categoryId ,"CategoriesChild");
      const q = query(categoriesChildRef);
      const querySnapshot = await getDocs(q);
    
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().category_title,
      }));
    };
    
    const updateType = async (courseId, categoryId, categoryChildId) => {
      try {
        const typeCollectionRef = collection(db, getCollectionPath(), courseId, "Type");
        const q = query(typeCollectionRef, where("category_child_id", "not-in", [""]));
        const typeQuerySnapshot = await getDocs(q);
    
        if (!typeQuerySnapshot.empty) {
          typeQuerySnapshot.forEach(async (docSnapshot) => {
            const typeDocRef = doc(db, getCollectionPath(), courseId, "Type", docSnapshot.id);
            await updateDoc(typeDocRef, { 
              category_id: categoryId,
              category_child_id: categoryChildId
            });
          });
        } else {
          console.log("No matching Type document found for this course.");
        }
      } catch (error) {
        console.error("Error updating category_id and category_child_id in Type collection: ", error);
      }
    };
    const fetchData = async (courseID) => {
      const fetchedCategories = await fetchCategories();
      setCategories(fetchedCategories);
 
      const typeCollectionRef = collection(db, getCollectionPath(), courseID, "Type");
      const q = query(typeCollectionRef, where("category_child_id", "not-in", [""]));
      const querySnapshot = await getDocs(q);
  

      if (!querySnapshot.empty) {

        const firstDoc = querySnapshot.docs[0].data();
        const fetchedCategoriesChild = await fetchCategoryChildren(firstDoc.category_id);
        setCategoryChildren(fetchedCategoriesChild);
        setDefaultCategoryId(firstDoc.category_id);
        setDefaultCategoryChildId(firstDoc.category_child_id);
      }
    };
  
    const handleCategorySelect = async (e) => {
      const selectedCategoryId = e.target.value;
      setCourseData(prevData => ({
        ...prevData,
        course_category_id: selectedCategoryId, 
      }));

      const children = await fetchCategoryChildren(selectedCategoryId);
      setCategoryChildren(children);
  
      if (children.length > 0) {
        setCourseData(prevData => ({
          ...prevData,
          course_level: children[0].id,
        }));
      } else {
        setCourseData(prevData => ({
          ...prevData,
          course_level: null, 
        }));
      }
  
    };
  
    const handleLevelSelect = (e) => {
      const selectedLevelId = e.target.value;
      setCourseData(prevData => ({
        ...prevData,
        course_level: selectedLevelId,
      }));
      // updateType(courseData.course_id, courseData.course_category_id || defaultCategoryId, selectedLevelId);
    };
  
    if (error) {
      return (
        <Container className="mt-5">
          <Alert variant="danger" className="text-center">
            <h4>Lỗi</h4>
            <p>{error}</p>
          </Alert>
        </Container>
      );
    }
    return (
      courseData ? (
      <Container className="mt-1">
        <AlertPopup alert={alert} setAlert={setAlert} />
        {courseData ? (
          <>
            <div className="d-flex align-items-center mb-4 mt-5">
              <i
                className="fas fa-arrow-left fa-1x"
                onClick={() => navigate('/giao-vien/quan-ly-khoa-hoc')}
                style={{ color: 'black', cursor: 'pointer' }}
              ></i>
              <h2 className="text-center flex-grow-1 mb-0">Chỉnh sửa khóa học</h2>
            </div>
  
            <Card className="shadow-sm border-0 mb-4">
              <Card.Body>
                <Form onSubmit={handleUpdate}>
                  <Form.Group controlId="formCourseTitle">
                    <Form.Label>Tên Khóa Học</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Nhập tên khóa học"
                      name="course_title"
                      value={courseData.course_title}
                      onChange={handleInputChange}
                      required
                    />
                  </Form.Group>
  
                  <Form.Group controlId="formCourseDescription">
                    <Form.Label>Mô Tả Khóa Học</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={5}
                      name="course_description"
                      value={courseData.course_description}
                      onChange={handleInputChange}
                      required
                    />
                  </Form.Group>
  
                    <Form.Group controlId="courseGrade" className="mt-2">
                      <Form.Label>Khối lớp</Form.Label>
                      <Form.Select
                        name="course_grade"
                        value={courseData.course_grade}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="10">Khối 10</option>
                        <option value="11">Khối 11</option>
                        <option value="12">Khối 12</option>
                      </Form.Select>
                    </Form.Group>
                    <Form.Group controlId="courseCategory" className="mt-2">
                      <Form.Label>Môn học</Form.Label>
                      <Form.Select
                        name="course_category"
                        value={courseData.course_category_id || defaultCategoryId} 
                        onChange={handleCategorySelect}
                        required
                      >
                        <option value="">Chọn môn học</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.title}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                    <Form.Group controlId="courseLevel" className="mt-2">
                    <Form.Label>Cấp độ</Form.Label>
                    <Form.Select
                      name="course_level"
                      value={courseData.course_level || defaultCategoryChildId}
                      onChange={handleLevelSelect}
                      required
                    >
                      <option value="">Chọn cấp độ</option>
                      {categoryChildren.map((child) => (
                        <option key={child.id} value={child.id}>
                          {child.title}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                  <Form.Group controlId="formCoursePrice">
                    <Form.Label>Giá Khóa Học</Form.Label>
                    <Form.Control
                      type="number"
                      placeholder="Nhập giá khóa học"
                      name="course_price"
                      value={courseData.course_price}
                      onChange={handleInputChange}
                      required
                      min="0"
                    />
                  </Form.Group>
  
                  <Form.Group controlId="formCourseTotalTime">
                    <Form.Label>Thời Gian Tổng Khóa Học</Form.Label>
                    <Form.Control
                      type="number"
                      placeholder="Nhập thời gian khóa học (giờ)"
                      name="course_total_time"
                      value={courseData.course_total_time}
                      onChange={handleInputChange}
                      required
                      min="1"
                    />
                  </Form.Group>
  
                  <Form.Group controlId="formCourseImage" className="text-center mt-3">
                    <Form.Label>Hình Ảnh Khóa Học:</Form.Label>
                    {courseData.course_img && (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '10px' }}>
                        <img
                          src={courseData.course_img}
                          alt="Hình ảnh khóa học"
                          style={{ width: '200px', objectFit: 'fill', height: '150px' }}
                        />
                      </div>
                    )}
                    <Form.Control
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </Form.Group>
  
                  <div className="d-flex justify-content-end mt-3">
                    <Button type="submit" className="ml-auto" disabled={loading}>
                      {loading ? 'Đang cập nhật...' : 'Cập nhật khóa học'}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
  
            <Card className="shadow-sm border-0 mb-4">
              <Card.Body>
                <h3 className="mt-4">Chương trình học</h3>
                <Button variant="success" className='mb-3' onClick={handleShowAddModal}>
                  <i className="fas fa-plus"></i> Thêm chương
                </Button>
                {loading1 == false ? <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="headings">
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps}>
                        {headings.map((heading, index) => (
                          <Draggable key={heading.id} draggableId={heading.id} index={index}>
                            {(provided) => (
                              <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="mb-2 p-2 border rounded">
                                <h5>{heading.heading_title}</h5>
                                <p>{heading.heading_description}</p>
                                <Button variant="warning" onClick={() => handleShowEditModal(heading)}>Chỉnh sửa</Button>
                                <Button className='ml-2' variant="danger" onClick={() => handleDeleteHeading(heading.id)}>Xóa</Button>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext> : <p className='text-center'>Đang tải dữ liệu...</p>}    
              </Card.Body>
            </Card>
            <HeadingManagerModal
              temp={temp}
              showModal={showModal}
              courseId = {courseId}
              courseData={courseData}
              fetchCourseData={fetchCourseData}
              resetNewHeading={resetNewHeading}
              newHeading={newHeading}
              handleEditHeading={handleEditHeading}
              handleAddHeading={handleAddHeading}
              setNewHeading={setNewHeading}
            />
            <Modal show={showConfirmDelete} onHide={() => setShowConfirmDelete(false)}>
              <Modal.Header closeButton>
                <Modal.Title>Xác nhận xóa</Modal.Title>
              </Modal.Header>
              <Modal.Body>Bạn có chắc chắn muốn xóa chương này?</Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowConfirmDelete(false)}>
                  Hủy
                </Button>
                <Button variant="danger" onClick={handleConfirmDelete}>
                  Xóa
                </Button>
              </Modal.Footer>
            </Modal>
          </>
        ) : (
          <p className='text-center'>Đang tải dữ liệu...</p>
        )}
      </Container>
        ) : (
          <p className='text-center'>Đang tải dữ liệu...</p>
        )
    );
  };
  
  export default EditCourse;
  
