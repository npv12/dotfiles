#!/usr/bin/python3
# Inspects ros dir for missing .so links and reports those packages.
#
# Copyright Sean Greenslade, July 2017
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

import sys
import os
import stat
import subprocess
import re
import pyalpm
from pycman import config
from pycman import pkginfo

rospath = "/opt/ros"

pkgs = []

if not os.path.isdir(rospath):
	print("Invalid path", rospath)
	sys.exit(1)
	
print("Inspecting...", end="")
sys.stdout.flush()

for root, dirs, files in os.walk(rospath):
	path = root.split(os.sep)
	for f in files:
		ff = os.path.join(rospath, root, f)
		if stat.S_IXUSR & os.stat(ff)[stat.ST_MODE]:
			p = subprocess.Popen(["ldd", ff], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
			result = p.stdout.readlines()
			print(".", end="")
			sys.stdout.flush()
			for l in result:
				if re.search("not found", l.decode()):
					#print("FOUND in", ff)
					#print("Offending lib:", l.decode().split()[0])

					q = subprocess.Popen(["pacman", "-Qo", ff], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
					resultq = q.stdout.readlines()
					for li in resultq:
						r = re.search("is owned by (.*) (.*)$", li.decode())
						if r:
							nam = r.group(1)
							#print(nam)
							if nam not in pkgs:
								pkgs.append(nam)
								#print("A")
							
handle = config.init_with_config("/etc/pacman.conf")
db = handle.get_localdb()

print()
print("Packages that need updating:")
for i in pkgs:
	print(i)
