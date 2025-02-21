import slugify from 'slugify';

export const generateSlug = (title: string, random = true, timeStamp = true) => {
  let baseSlug = slugify(title, { lower: true });
  // const timestamp = Date.now().toString();
  // const randomPart = Math.floor(Math.random() * 10000)
  //   .toString()
  //   .padStart(4, '0');

  // if (random) {
  //   baseSlug += `-${randomPart}`;
  // }
  // if (timeStamp) {
  //   baseSlug += `-${timestamp}`;
  // }

  // shorter slug
  const day = new Date().getDate().toString().padStart(2, '0');

  const randomPart = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');

  const uniquePart = `${day}${randomPart}`.slice(0, 5);

  if (random || timeStamp) {
    baseSlug += `-${uniquePart}`;
  }
  return baseSlug;
};

/**
 * a function to generate a random string of length len
 * @param len
 */
export function generateRandom(len: number) {
  let pass = '';
  const str = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + 'abcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 1; i <= len; i++) {
    const char = Math.floor(Math.random() * str.length + 1);
    pass += str.charAt(char);
  }
  return pass;
}
