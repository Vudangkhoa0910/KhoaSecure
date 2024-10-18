import cv2
import numpy as np
import os

# Đường dẫn đến thư mục chứa dữ liệu khuôn mặt
dataset_path = '/Users/vudangkhoa/Documents/CODE ON CLASS/An toàn và bảo mật thông tin/ProductSemi/khoasecure/trainer/face_dataset'
recognizer = cv2.face.LBPHFaceRecognizer_create()
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

# Hàm lấy dữ liệu khuôn mặt và nhãn
def get_images_and_labels(path):
    image_paths = [os.path.join(path, f) for f in os.listdir(path)]
    face_samples = []
    ids = []

    for image_path in image_paths:
        # Bỏ qua các file không phải là file hình ảnh
        if image_path.endswith(".jpg") or image_path.endswith(".png"):
            gray_img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)  # Đọc ảnh grayscale
            user_id = int(os.path.split(image_path)[-1].split(".")[1])  # Lấy ID từ tên file
            faces = face_cascade.detectMultiScale(gray_img)

            for (x, y, w, h) in faces:
                face_samples.append(gray_img[y:y + h, x:x + w])
                ids.append(user_id)

    return face_samples, ids


# Lấy ảnh và nhãn từ dữ liệu
faces, ids = get_images_and_labels(dataset_path)

# Huấn luyện mô hình với ảnh và nhãn
recognizer.train(faces, np.array(ids))

# Lưu mô hình đã huấn luyện
recognizer.write('trainer.yml')

print("Mô hình đã được huấn luyện và lưu.")
