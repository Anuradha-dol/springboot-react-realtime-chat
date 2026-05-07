# Spring Boot React Real-Time Chat App

A secure full-stack real-time chat application built with **Spring Boot**, **React**, **JWT**, **HttpOnly cookies**, **WebSocket/STOMP**, and **PostgreSQL**.

The project supports email OTP verification, forgot password OTP flow, private chat, group chat, media uploads, profile management, and account deletion with password confirmation.

---

## Features

### Authentication & Security

- User registration with email OTP verification
- Login with username or email
- JWT access token and refresh token flow
- HttpOnly cookie support for secure session handling
- Refresh token endpoint for keeping users logged in
- Protected backend APIs using Spring Security
- Protected frontend routes using React Router
- Forgot password with OTP verification
- Password reset using BCrypt password encoding
- Soft delete account flow with password confirmation
- Public and protected API separation
- CORS configured for React frontend

### Real-Time Chat

- Private one-to-one messaging
- Group chat support
- Real-time messaging using WebSocket, STOMP, and SockJS
- Typing indicators
- Online/offline presence events
- Read/seen status support
- Delete message for me
- Delete message for everyone
- Reply-to-message support in private messages

### Group Features

- Create group chats
- Add group members
- Remove group members
- Leave groups
- Update group profile
- Update group image
- Group member roles
- Group message seen status
- Group polls and voting
- Real-time group events

### Profile & Settings

- View own profile
- View other users' profiles
- Edit first name, last name, email, phone number, and bio
- Upload profile photo
- Upload cover photo
- Change password
- Delete account securely with current password

### Media Uploads

- Upload chat images
- Upload chat videos
- Upload group images
- Upload profile photos
- Upload cover photos
- Local file storage using the `uploads` folder
- Public access for profile, cover, and group images
- Protected access for private chat media

---

## Tech Stack

### Backend

- Java 25
- Spring Boot 4.0.3
- Spring Security
- Spring Web MVC
- Spring WebSocket
- Spring Data JPA
- Spring Validation
- Spring Mail
- PostgreSQL
- JWT using JJWT
- Lombok
- Maven

### Frontend

- React 19
- Vite
- React Router DOM
- Redux Toolkit
- Axios
- STOMP JS
- SockJS Client
- CSS Modules / Custom CSS

---

## Project Structure

```text
springboot-react-realtime-chat-main/
├── backend/
│   ├── pom.xml
│   └── src/main/
│       ├── java/com/yourname/chatapp/
│       │   ├── auth/
│       │   ├── chat/
│       │   │   ├── groupchat/
│       │   │   ├── privatechat/
│       │   │   └── websocket/
│       │   ├── common/
│       │   ├── config/
│       │   ├── media/
│       │   ├── message/
│       │   ├── notification/
│       │   ├── profile/
│       │   ├── security/
│       │   ├── upload/
│       │   ├── user/
│       │   └── websocket/
│       └── resources/
│           └── application.properties
│
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── api/
        ├── assets/
        ├── components/
        ├── config/
        ├── context/
        ├── features/
        ├── hooks/
        ├── pages/
        ├── routes/
        ├── services/
        ├── store/
        ├── styles/
        ├── utils/
        └── websocket/
