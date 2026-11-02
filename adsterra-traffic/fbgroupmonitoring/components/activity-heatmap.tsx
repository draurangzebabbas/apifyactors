"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { SpinnerGap, TrendUp, Clock, Info } from "@phosphor-icons/react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ActivityHeatmapProps {
  userId: string
  groups?: Array<{ id: string; group_name: string }>
  defaultGroupId?: string
}

interface HeatmapData {
  grid: number[][] // [7 days][24 hours]
  totalEvents: number
  peakWindow: { day: string; startHour: number; endHour: number; count: number } | null
  quietestStretch: { description: string; count: number } | null
  maxValue: number
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function ActivityHeatmap({ userId, groups = [], defaultGroupId = 'all' }: ActivityHeatmapProps) {
  const [data, setData] = useState<HeatmapData | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Controls
  const [selectedGroup, setSelectedGroup] = useState<string>(defaultGroupId)
  const [days, setDays] = useState<string>("30")
  const [hourFilter, setHourFilter] = useState<"all" | "day" | "night">("all")
  const [matchFilter, setMatchFilter] = useState<"all" | "matched">("all")

  const fetchHeatmap = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      
      const { data: adminUser } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle()

      const userIsAdmin = !!adminUser;

      let allowedGroupIds: string[] = [];
      let isGlobalAdminView = false;

      if (!userIsAdmin) {
        const { data: members, error: memErr } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', userId)
          .eq('is_active', true);
          
        if (memErr) throw new Error(memErr.message);
        allowedGroupIds = (members || []).map((m: any) => m.group_id);

        if (selectedGroup && selectedGroup !== 'all') {
          if (!allowedGroupIds.includes(selectedGroup)) throw new Error('Unauthorized');
          allowedGroupIds = [selectedGroup];
        }
      } else {
        if (selectedGroup && selectedGroup !== 'all') {
          allowedGroupIds = [selectedGroup];
        } else {
          isGlobalAdminView = true;
        }
      }

      if (!isGlobalAdminView && allowedGroupIds.length === 0) {
        setData({ grid: Array(7).fill(Array(24).fill(0)), totalEvents: 0, peakWindow: null, quietestStretch: null, maxValue: 0 })
        return;
      }

      // We need `joined_at` mapping to filter out historical data before user joined
      let groupJoinDates: Record<string, string> = {};
      if (!isGlobalAdminView) {
        const { data: members, error: memErr } = await supabase
          .from('group_members')
          .select('group_id, joined_at')
          .eq('user_id', userId)
          .eq('is_active', true);
        
        if (!memErr && members) {
          members.forEach((m: any) => {
             groupJoinDates[m.group_id] = (m.joined_at || new Date(0).toISOString()).split('T')[0];
          });
        }
      }

      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - parseInt(days));
      
      let statsQuery;
      
      if (matchFilter === 'matched') {
        statsQuery = supabase
          .from('hourly_user_match_stats')
          .select('group_id, date, hour, match_count')
          .eq('user_id', userId)
          .gte('date', sinceDate.toISOString().split('T')[0]);
      } else {
        statsQuery = supabase
          .from('hourly_post_stats')
          .select('group_id, date, hour, post_count')
          .gte('date', sinceDate.toISOString().split('T')[0]);
      }
        
      if (!isGlobalAdminView) {
        statsQuery = statsQuery.in('group_id', allowedGroupIds);
      }

      const { data: rawStats, error: statsErr } = await statsQuery;
      if (statsErr) throw new Error(statsErr.message);
      const stats = (rawStats || []) as any[];

      // Initialize 7x24 grid (0=Sun, 6=Sat)
      const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
      let totalEvents = 0;
      
      for (const stat of stats) {
        // Filter out stats that occurred before the user joined this group
        if (!isGlobalAdminView && groupJoinDates[stat.group_id]) {
           if (stat.date < groupJoinDates[stat.group_id]) {
              continue; // Skip this historical data
           }
        }

        const dateObj = new Date(stat.date);
        const dayOfWeek = dateObj.getUTCDay(); // 0-6
        const hour = stat.hour; // 0-23
        
        if (hourFilter === "day" && (hour < 6 || hour >= 18)) continue;
        if (hourFilter === "night" && (hour >= 6 && hour < 18)) continue;

        if (grid[dayOfWeek] && grid[dayOfWeek][hour] !== undefined) {
          const count = matchFilter === 'matched' ? (stat.match_count || 0) : (stat.post_count || 0);
          grid[dayOfWeek][hour] += count;
          totalEvents += count;
        }
      }

      let maxValue = 0;
      for (let d = 0; d < 7; d++) {
        for (let h = 0; h < 24; h++) {
          if (grid[d][h] > maxValue) maxValue = grid[d][h];
        }
      }

      // Calculate Peak Window
      let maxBlock = -1;
      let peakDay = 0;
      let peakStart = 0;
      for (let d = 0; d < 7; d++) {
        for (let h = 0; h <= 20; h++) {
          const sum = grid[d][h] + grid[d][h+1] + grid[d][h+2] + grid[d][h+3];
          if (sum > maxBlock) {
            maxBlock = sum;
            peakDay = d;
            peakStart = h;
          }
        }
      }
      
      const daysArr = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const peakWindow = maxBlock > 0 
        ? { day: daysArr[peakDay], startHour: peakStart, endHour: peakStart + 4, count: maxBlock } 
        : null;

      // Calculate Quietest Stretch
      let minBlock = Infinity;
      let quietDay = 0;
      let quietStart = 0;
      for (let d = 0; d < 7; d++) {
        for (let h = 0; h <= 16; h++) {
          let sum = 0;
          for (let i = 0; i < 8; i++) sum += grid[d][h+i];
          if (sum < minBlock) {
            minBlock = sum;
            quietDay = d;
            quietStart = h;
          }
        }
      }
      
      const quietestStretch = minBlock !== Infinity && totalEvents > 0
        ? { description: `${daysArr[quietDay]}s ${quietStart.toString().padStart(2, '0')}:00 - ${(quietStart + 8).toString().padStart(2, '0')}:00`, count: minBlock }
        : null;

      setData({
        grid,
        totalEvents,
        peakWindow,
        quietestStretch,
        maxValue
      });

    } catch (err) {
      console.error("Failed to fetch heatmap data", err)
      setData({ grid: Array(7).fill(Array(24).fill(0)), totalEvents: 0, peakWindow: null, quietestStretch: null, maxValue: 0 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!userId) return
    fetchHeatmap()
  }, [selectedGroup, days, hourFilter, matchFilter, userId])

  // Filter hours based on control
  const startHour = hourFilter === "day" ? 6 : hourFilter === "night" ? 18 : 0
  const endHour = hourFilter === "day" ? 18 : hourFilter === "night" ? 24 : 24
  // For 'night', we actually want 18 to 24 AND 0 to 6. To keep it simple in a grid:
  const displayHours: number[] = []
  if (hourFilter === "all" || hourFilter === "day") {
    for (let i = startHour; i < endHour; i++) displayHours.push(i)
  } else if (hourFilter === "night") {
    for (let i = 18; i < 24; i++) displayHours.push(i)
    for (let i = 0; i < 6; i++) displayHours.push(i)
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
        <div>
          <CardTitle>Activity Heatmap</CardTitle>
          <CardDescription>When do people post the most?</CardDescription>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mt-4 sm:mt-0">
          <Select value={matchFilter} onValueChange={(val: string | null) => { if (val === 'all' || val === 'matched') setMatchFilter(val) }}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Show..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Posts</SelectItem>
              <SelectItem value="matched">Matched Only</SelectItem>
            </SelectContent>
          </Select>

          {groups.length > 0 && (
            <Select value={selectedGroup} onValueChange={(val) => val && setSelectedGroup(val)}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="All Groups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {groups.map(g => (
                  <SelectItem key={g.id} value={g.id}>{g.group_name || 'Unknown'}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex items-center rounded-md border p-0.5">
            <Button variant={days === "7" ? "secondary" : "ghost"} size="sm" className="h-7 text-xs px-2" onClick={() => setDays("7")}>7d</Button>
            <Button variant={days === "30" ? "secondary" : "ghost"} size="sm" className="h-7 text-xs px-2" onClick={() => setDays("30")}>30d</Button>
            <Button variant={days === "90" ? "secondary" : "ghost"} size="sm" className="h-7 text-xs px-2" onClick={() => setDays("90")}>90d</Button>
          </div>

          <div className="flex items-center rounded-md border p-0.5">
            <Button variant={hourFilter === "all" ? "secondary" : "ghost"} size="sm" className="h-7 text-xs px-2" onClick={() => setHourFilter("all")}>All</Button>
            <Button variant={hourFilter === "day" ? "secondary" : "ghost"} size="sm" className="h-7 text-xs px-2" onClick={() => setHourFilter("day")}>Day</Button>
            <Button variant={hourFilter === "night" ? "secondary" : "ghost"} size="sm" className="h-7 text-xs px-2" onClick={() => setHourFilter("night")}>Night</Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading || !data ? (
          <div className="flex items-center justify-center py-12">
            <SpinnerGap className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data.totalEvents === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3 text-muted-foreground">
            <Info className="h-10 w-10 opacity-30" />
            <p className="text-sm font-medium">No activity data yet</p>
            <p className="text-xs max-w-xs">
              Once you add groups and posts start being tracked, your posting activity will appear here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            
            {/* Grid Container */}
            <div className="overflow-x-auto pb-4">
              <div className="min-w-[600px] flex flex-col gap-1.5">
                
                {/* X-Axis Labels */}
                <div className="flex pl-12 text-[10px] text-muted-foreground font-medium">
                  {displayHours.map((h, i) => (
                    <div key={h} className="flex-1 text-center truncate">
                      {hourFilter === 'all' ? (h % 6 === 0 ? `${h.toString().padStart(2, '0')}:00` : '') : `${h.toString().padStart(2, '0')}:00`}
                    </div>
                  ))}
                </div>

                <TooltipProvider delay={100}>
                  {DAYS.map((dayName, dayIndex) => {
                    // Assuming grid starts with 0 = Sunday
                    // If we want Mon-Sun display, we shift:
                    const dIdx = dayIndex === 6 ? 0 : dayIndex + 1;
                    const rowName = DAYS[dIdx];

                    return (
                      <div key={rowName} className="flex items-center gap-2">
                        <div className="w-10 text-xs font-medium text-muted-foreground text-right shrink-0">
                          {rowName.slice(0, 3)}
                        </div>
                        <div className="flex flex-1 gap-1">
                          {displayHours.map(hour => {
                            const count = data.grid[dIdx][hour]
                            const normalised = data.maxValue > 0 ? count / data.maxValue : 0
                            const mixPercent = Math.max(15, normalised * 100).toFixed(0)
                            const bg = count === 0
                              ? 'color-mix(in srgb, var(--primary) 7%, transparent)'
                              : `color-mix(in srgb, var(--primary) ${mixPercent}%, transparent)`
                            
                            return (
                              <Tooltip key={`${dIdx}-${hour}`}>
                                <TooltipTrigger render={
                                  <div 
                                    className="h-5 flex-1 min-w-[12px] rounded-sm transition-all hover:scale-110 cursor-default"
                                    style={{ backgroundColor: bg }}
                                  />
                                } />
                                <TooltipContent side="top" className="text-xs">
                                  <p className="font-semibold">{rowName} at {hour.toString().padStart(2, '0')}:00</p>
                                  <p className="text-muted-foreground">{count} post{count !== 1 ? 's' : ''}</p>
                                </TooltipContent>
                              </Tooltip>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </TooltipProvider>

              </div>
            </div>

            {/* Legend & Insights */}
            <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center p-4 bg-muted/30 rounded-lg border">
              
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mb-1">
                  <span>Less</span>
                  <div className="flex gap-1">
                    {[0.06, 0.25, 0.5, 0.75, 1].map(op => (
                      <div key={op} className="h-3 w-4 rounded-sm" style={{ backgroundColor: `hsl(var(--primary) / ${op})` }} />
                    ))}
                  </div>
                  <span>More</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Based on {data.totalEvents.toLocaleString()} posts from the last {days} days.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
                {data.peakWindow && (
                  <div className="flex gap-3 items-start">
                    <div className="p-2 rounded-full bg-primary/10 text-primary mt-0.5">
                      <TrendUp className="h-4 w-4" weight="bold" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Peak window</p>
                      <p className="text-sm font-semibold">
                        {data.peakWindow.day}, {String(data.peakWindow.startHour).padStart(2,'0')}:00 to {String(data.peakWindow.endHour).padStart(2,'0')}:00
                      </p>
                    </div>
                  </div>
                )}
                
                {data.quietestStretch && (
                  <div className="flex gap-3 items-start">
                    <div className="p-2 rounded-full bg-muted text-muted-foreground mt-0.5">
                      <Clock className="h-4 w-4" weight="bold" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Quietest stretch</p>
                      <p className="text-sm font-semibold">
                        {data.quietestStretch.description}
                      </p>
                    </div>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}
      </CardContent>
    </Card>
  )
}
