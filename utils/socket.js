let io = null;

export const setIo = (socketInstance) => {
  io = socketInstance;
};

export const getIo = () => io;

export default { setIo, getIo };
