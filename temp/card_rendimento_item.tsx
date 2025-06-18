            {/* Card de Rendimento por Item */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" gutterBottom>
                  Rendimento por Item
                </Typography>
                
                {loadingDados ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
                    <CircularProgress />
                  </Box>
                ) : Object.keys(rendimentoPorItem).length === 0 ? (
                  <Typography variant="body1" color="text.secondary" sx={{ py: 4, textAlign: 'center', flexGrow: 1 }}>
                    Nenhum dado disponível para os filtros selecionados
                  </Typography>
                ) : (
                  <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    {Object.entries(rendimentoPorItem)
                      .sort(([, a], [, b]) => b.rendimento - a.rendimento)
                      .map(([item, {rendimento, camisetas, malha}]) => (
                        <Box key={item} sx={{ mb: 2 }}>
                          <Typography variant="body2" sx={{ mb: 0.5 }}>
                            {item} - {camisetas}pçs - {malha.toFixed(2)}kg
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ flexGrow: 1, mr: 1 }}>
                              <LinearProgress 
                                variant="determinate" 
                                value={100} 
                                sx={{ 
                                  height: 10, 
                                  borderRadius: 5,
                                  backgroundColor: '#f0f0f0',
                                  '& .MuiLinearProgress-bar': {
                                    backgroundColor: '#e57373'
                                  }
                                }} 
                              />
                            </Box>
                            <Typography variant="body2" sx={{ minWidth: 60, textAlign: 'right' }}>
                              {rendimento.toFixed(2)} camisetas/kg
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                  </Box>
                )}
              </Paper>
            </Grid>
