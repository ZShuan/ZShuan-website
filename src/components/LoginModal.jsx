import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginModal({ isOpen, onClose, onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // 简单的验证逻辑
    setTimeout(() => {
      if (password === '250701') {
        onLogin();
        onClose();
        setPassword('');
      } else {
        setError('密码错误，请重新输入');
      }
      setIsLoading(false);
    }, 800); // 模拟网络延迟
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(5px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={handleClose}
          >
            {/* 登录弹窗 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
              transition={{ 
                duration: 0.4,
                type: "spring",
                damping: 25,
                stiffness: 300
              }}
              style={{
                background: 'linear-gradient(135deg, #F6BEC8 0%, #E8A5B8 100%)',
                borderRadius: '20px',
                padding: '40px',
                width: '400px',
                maxWidth: '90vw',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                position: 'relative'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 关闭按钮 */}
              <motion.button
                onClick={handleClose}
                style={{
                  position: 'absolute',
                  top: '15px',
                  right: '15px',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  color: '#3D3B4F',
                  transition: 'all 0.3s ease'
                }}
                whileHover={{
                  background: 'rgba(255, 255, 255, 0.3)',
                  scale: 1.1
                }}
                whileTap={{ scale: 0.9 }}
              >
                ×
              </motion.button>

              {/* 标题 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                style={{
                  textAlign: 'center',
                  marginBottom: '30px'
                }}
              >
                <h2 style={{
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  color: '#3D3B4F',
                  margin: '0 0 10px 0'
                }}>
                  验证身份
                </h2>
                <p style={{
                  fontSize: '1rem',
                  color: 'rgba(61, 59, 79, 0.8)',
                  margin: 0
                }}>
                  请输入密码继续探索
                </p>
              </motion.div>

              {/* 登录表单 */}
              <motion.form
                onSubmit={handleSubmit}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                {/* 密码输入框 */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    color: '#3D3B4F'
                  }}>
                    密码
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      background: 'rgba(255, 255, 255, 0.9)',
                      fontSize: '1rem',
                      color: '#3D3B4F',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.8)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(255, 255, 255, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                      e.target.style.boxShadow = 'none';
                    }}
                    required
                  />
                </div>

                {/* 错误信息 */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{
                        background: 'rgba(220, 53, 69, 0.1)',
                        border: '1px solid rgba(220, 53, 69, 0.3)',
                        borderRadius: '8px',
                        padding: '10px',
                        marginBottom: '20px',
                        color: '#dc3545',
                        fontSize: '0.9rem',
                        textAlign: 'center'
                      }}
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 登录按钮 */}
                <motion.button
                  type="submit"
                  disabled={isLoading || !password}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: isLoading || !password 
                      ? 'rgba(61, 59, 79, 0.5)' 
                      : 'linear-gradient(135deg, #3D3B4F 0%, #5D5A6F 100%)',
                    color: 'white',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    cursor: isLoading || !password ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                  }}
                >
                  {isLoading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid transparent',
                          borderTop: '2px solid white',
                          borderRadius: '50%'
                        }}
                      />
                      验证中...
                    </>
                  ) : (
                    '登录'
                  )}
                </motion.button>

                {/* 提示信息 */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  style={{
                    textAlign: 'center',
                    marginTop: '20px',
                    fontSize: '0.8rem',
                    color: 'rgba(61, 59, 79, 0.7)',
                    lineHeight: '1.4'
                  }}
                >
                  入住小家
                </motion.div>
              </motion.form>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
