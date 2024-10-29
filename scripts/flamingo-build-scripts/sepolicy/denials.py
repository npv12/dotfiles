# Copyright (C) 2019-2023 Parishudh Machines
# Denials Input : denials.txt 
# Fixed Output : fixdenials.txt

import re
import datetime

blob = datetime.datetime.now()
denres = ""
denlist = []

with open("denials.txt") as deninput:
    denlines = deninput.readlines()
    
regex = {}

regex[0] = re.compile(r"scontext=u:r:(.*?):", re.IGNORECASE)
regex[1] = re.compile(r"tcontext=.*:(.*?):", re.IGNORECASE)
regex[2] = re.compile(r"tclass=(.*?) ", re.IGNORECASE)
regex[3] = re.compile(r"{ .*? }", re.IGNORECASE)

for text in denlines:

    if "scontext" not in text :
        continue

    denialfix = "allow "
    try:
        denialfix += f"{re.findall(regex[0], text)[0]} "
        denialfix += f"{re.findall(regex[1], text)[0]}:"
        denialfix += f"{re.findall(regex[2], text)[0]} "
        denialfix += f"{re.findall(regex[3], text)[0]};"
    except:
        print("Oh no! ", text)
    
    if denialfix in denlist:
        continue

    denres += f"{denialfix}\n"
    
    denlist.append(denialfix)

fixfile = open(f"fixes.txt_{blob.timestamp()}", "w")
fixfile.write(denres)
fixfile.close()