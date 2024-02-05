#!/bin/bash

fvtt package workon "loghorizontrpg" --type "System"

for p in packs/*
do
	fvtt package pack "${p#packs/}" --in "${p}/_source" --out "${p%/*}"
done

echo Packing finished
