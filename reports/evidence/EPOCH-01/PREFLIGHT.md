$ node -v
v20.19.6

$ npm -v
11.4.2

$ git --version
git version 2.43.0

$ pwd
/workspace/Treasure_engine

$ ls -la
total 548
drwxr-xr-x 5 root root   4096 Feb 10 18:31 .
drwxr-xr-x 3 root root   4096 Feb 10 17:56 ..
drwxr-xr-x 8 root root   4096 Feb 10 18:31 .git
-rw-r--r-- 1 root root 538957 Feb 10 17:56 TREASURE_ENGINE_FINAL_VALIDATED_WITH_AGENTS.zip
drwxr-xr-x 3 root root   4096 Feb 10 18:31 repo
drwxr-xr-x 3 root root   4096 Feb 10 18:31 reports

$ git status -sb
## work
?? reports/

$ git rev-parse HEAD
c1b32de9b4110434b7c93cf76803d9e2468b5083

$ find . -maxdepth 2 -type f \( -name "*.zip" -o -name "*.tar.gz" -o -name "package.json" \) | sort
./TREASURE_ENGINE_FINAL_VALIDATED_WITH_AGENTS.zip
