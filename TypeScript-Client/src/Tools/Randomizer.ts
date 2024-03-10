function getRandomInteger(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const Randomizer = {
  getRandomInteger,
};

export default Randomizer;
