#!/bin/bash

mkdir -p zip
rm zip/*

echo Creating new zip...
zip -j -9 zip/game app/*
echo Finished.

SIZE="$(stat --format="%s" zip/game.zip)"
echo "Zip size:  $SIZE bytes"
