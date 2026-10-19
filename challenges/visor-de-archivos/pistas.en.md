Open one of the documents and look at the URL: the `archivo` parameter holds the name of the file being read. Also read the "acerca" document.
---
The "acerca" document says internal files live in `/tmp/secreto`, outside the documents folder. In a path, `..` means "go up one folder".
---
Put in `archivo` a path that climbs several levels to the root and then goes down to `tmp/secreto/flag.txt`. If it does not work, try with more or fewer `../`.
---
For example: `/ver?archivo=../../../tmp/secreto/flag.txt`.
