import { fileURLToPath } from 'node:url';
import { checkSizeReasons } from '@dieselpunk/testing/size';

checkSizeReasons(fileURLToPath(new URL('..', import.meta.url)));
