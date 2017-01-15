FROM node:4-wheezy
MAINTAINER  Buddhika Jayawardhana  <buddhika@siplo.lk>

RUN apt-get update -yq && \
    apt-get install -yq curl unzip git libcairo2-dev libjpeg8-dev libpango1.0-dev libgif-dev build-essential g++
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY ./package.json /usr/src/app/
RUN npm install -g bower
RUN npm install
COPY . /usr/src/app
RUN mv .git git
RUN bower install --allow-root
RUN mv git .git

CMD [ "node", "whiteboard.js" ]

EXPOSE 9002