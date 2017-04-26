![][SiploImage]

This project was originally forked from [Ether Draw](https://github.com/JohnMcLear/draw) and developed by Siplo Team. Use it, Make the worl a better place !

Siplo Whiteboard
================
This is the collaborative drawing tool used in Siplo Online Tutoring platform. This project was initiated using [etherdraw] which is released under Apache License

Installation
------------
  1. Install Requirements. ``sudo apt-get update && sudo apt-get install libcairo2-dev libjpeg8-dev libpango1.0-dev libgif-dev build-essential g++``
  2. Install EtherDraw `` git clone git://github.com/buddhikajay/draw.git ``
  3. Enter the EtherDraw folder `` cd draw ``
  4. Run EtherDraw `` bin/run.sh `` 
  5. Make a drawing!  Open your browser and visit `` http://127.0.0.1:9002 ``

Requirements
------------
 * [NodeJS > v12] (http://nodejs.org/)
 * Lib Cairo
 * Lib Jpeg
 * Lib Gif
 * Chuck Norris dreams in fists


Enabling Loging

1. npm install redis
2. npm install cookies
3. add <.siplo.lk> for session.cookie_domain in etc/php5/cli/php.ini to enable the cookies for sub domains 


[Siplo.lk]: https://siplo.lk
[SiploImage]: https://www.siplo.lk/bundles/siplouser/images/Logo03.png
[etherdraw]: https://github.com/JohnMcLear/draw

Environment Varialbles for Docker
---------------------------------

* DB_TYPE
* DB_USER
* DB_PASSWORD
* DB_HOST
* DB_NAME