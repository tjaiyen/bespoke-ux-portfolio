# Third-party notices

This repository redistributes third-party code. The notices below are reproduced as those
licenses require.

## three.js

`public/gallery/_vendor/three.module.js` and `public/gallery/_vendor/three.core.js` are an
unmodified copy of three.js, shared by the generated sites published under `/gallery`.

The bundles carry an SPDX header identifying the license, but the MIT license requires the
full permission notice to travel with any redistribution — a header alone does not satisfy
it. That is why this file exists.

```
The MIT License

Copyright © 2010-2024 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

## Fonts

Playfair Display, Plus Jakarta Sans and JetBrains Mono are served through `next/font`,
which self-hosts them at build time. All three are licensed under the SIL Open Font
License 1.1, which permits redistribution as part of a larger work.

## This repository's own content

No `LICENSE` file is present, which under copyright law means **all rights reserved**.
That is deliberate for a personal portfolio: the case-study writing, the design system and
the generated showcase sites are work samples, not a library for reuse. Adding an
open-source license would be a separate, explicit decision.
